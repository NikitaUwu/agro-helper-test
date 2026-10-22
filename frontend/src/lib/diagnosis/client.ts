import type { DiagnosisRequest, DiagnosisOutcome, AnalysisProgress } from './types';
import { ImageInputError, validateImage, preprocessImage } from './preprocess';
import { evaluatePrediction } from './policy';

let worker: Worker | null = null;
let activeRequestId: string | null = null;
export function disposeDiagnosisWorker() { worker?.terminate(); worker = null; activeRequestId = null; }

export async function analyzeLeaf(
  request: DiagnosisRequest, onProgress: (event: AnalysisProgress) => void, signal: AbortSignal,
): Promise<DiagnosisOutcome> {
  const { requestId } = request;
  if (signal.aborted) return { status: 'cancelled', requestId };
  if (activeRequestId) return { status: 'error', requestId, reason: 'inference_failed', message: 'Дождитесь текущего анализа или отмените его.' };
  activeRequestId = requestId;
  const release = () => { if (activeRequestId === requestId) activeRequestId = null; };
  // Decoding is asynchronous too: cancellation must release the slot before it completes.
  signal.addEventListener('abort', release, { once: true });
  let image: ImageBitmap | undefined;
  let pixels: Float32Array;
  try {
    onProgress({ phase: 'preparing' });
    image = await validateImage(request.image);
    if (signal.aborted) return { status: 'cancelled', requestId };
    pixels = preprocessImage(image);
  } catch (error) {
    release();
    return { status: 'error', requestId, reason: error instanceof ImageInputError ? error.reason : 'decode_failed', message: error instanceof Error ? error.message : 'Не удалось подготовить фотографию.' };
  } finally { image?.close(); signal.removeEventListener('abort', release); if (signal.aborted) release(); }
  if (signal.aborted) return { status: 'cancelled', requestId };

  return new Promise<DiagnosisOutcome>(resolve => {
    let centroids: Float32Array | undefined;
    let initializationMs = 0;
    let settled = false;
    const finish = (outcome: DiagnosisOutcome) => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      if (worker) { worker.onmessage = null; worker.onerror = null; }
      release();
      resolve(outcome);
    };
    const cancel = () => { disposeDiagnosisWorker(); finish({ status: 'cancelled', requestId }); };
    const timeout = setTimeout(() => {
      disposeDiagnosisWorker();
      finish({ status: 'error', requestId, reason: 'timeout', message: 'Анализ занял слишком много времени. Проверьте соединение и попробуйте ещё раз.' });
    }, 120_000);
    signal.addEventListener('abort', cancel, { once: true });
    try {
      if (signal.aborted) { cancel(); return; }
      worker ??= new Worker('/diagnosis.worker.js');
      worker.onerror = () => {
        disposeDiagnosisWorker();
        finish({ status: 'error', requestId, reason: 'model_load_failed', message: 'Не удалось запустить анализ в браузере. Обновите страницу или попробуйте другой браузер.' });
      };
      worker.onmessage = ({ data }) => {
        if (data.requestId !== requestId || settled) return;
        if (data.type === 'progress') onProgress(data);
        if (data.type === 'ready') {
          centroids = data.centroids; initializationMs = data.initializationMs;
        }
        if (data.type === 'result') {
          if (!centroids) { finish({ status: 'error', requestId, reason: 'inference_failed', message: 'Модель не прошла проверку. Повторите попытку.' }); return; }
          finish(evaluatePrediction(data.logits, data.features, centroids, {
            requestId, source: request.source, inferenceMs: data.inferenceMs, initializationMs,
          }));
        }
        if (data.type === 'error') {
          disposeDiagnosisWorker();
          finish({ status: 'error', requestId, reason: data.reason, message: data.reason === 'model_load_failed' ? 'Не удалось загрузить модель. Проверьте интернет и повторите попытку.' : 'Не удалось выполнить анализ. Попробуйте другой снимок.' });
        }
      };
      onProgress({ phase: 'loading' });
      worker.postMessage({ type: 'infer', requestId, pixels: pixels.buffer }, [pixels.buffer]);
    } catch {
      disposeDiagnosisWorker();
      finish({ status: 'error', requestId, reason: 'model_load_failed', message: 'Этот браузер не смог запустить анализ. Попробуйте современный Chrome, Edge или Safari.' });
    }
  });
}

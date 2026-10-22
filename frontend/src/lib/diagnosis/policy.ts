import type { DiagnosisOutcome, InferenceContext, UncertainReason } from './types';
import { MODEL_LABELS, MODEL_REVISION, POLICY_VERSION, PREPROCESSING_VERSION } from './registry';

export const THRESHOLDS = { score: 0.85, margin: 0.20, cosine: 0.699429452419281 } as const;
export function softmax(logits: Float32Array): number[] {
  const max = Math.max(...logits);
  const exponentials = Array.from(logits, value => Math.exp(value - max));
  const sum = exponentials.reduce((a, b) => a + b, 0);
  return exponentials.map(value => value / sum);
}

export function evaluatePrediction(
  logits: Float32Array, features: Float32Array, centroids: Float32Array, context: InferenceContext,
): DiagnosisOutcome {
  const invalid = (): DiagnosisOutcome => ({ status: 'error', requestId: context.requestId, reason: 'inference_failed', message: 'Не удалось проверить ответ модели. Попробуйте ещё раз.' });
  if (logits.length !== 38 || features.length !== 768 || centroids.length !== 38 * 768 ||
      !logits.every(Number.isFinite) || !features.every(Number.isFinite) || !centroids.every(Number.isFinite)) return invalid();
  const norm = Math.hypot(...features);
  if (!Number.isFinite(norm) || norm === 0) return invalid();
  let similarity = -1;
  for (let k = 0; k < 38; k++) {
    let dot = 0;
    for (let j = 0; j < 768; j++) dot += features[j] * centroids[k * 768 + j];
    similarity = Math.max(similarity, dot / norm);
  }
  if (!Number.isFinite(similarity) || similarity > 1.0001) return invalid();
  const probabilities = softmax(logits);
  const top3 = probabilities.map((score, index) => ({
    index, label: MODEL_LABELS[index].rawLabel, conditionId: MODEL_LABELS[index].conditionId,
    cropId: MODEL_LABELS[index].cropId, score,
  })).sort((a, b) => b.score - a.score).slice(0, 3);
  const winner = MODEL_LABELS[top3[0].index];
  const metadata = { ...context, modelRevision: MODEL_REVISION, policyVersion: POLICY_VERSION, preprocessingVersion: PREPROCESSING_VERSION };
  let reason: UncertainReason | undefined;
  if (similarity < THRESHOLDS.cosine) reason = 'ood';
  else if (!winner.enabled || !winner.conditionId || !winner.cropId) reason = 'unsupported_class';
  else if (top3[0].score < THRESHOLDS.score) reason = 'low_score';
  else if (top3[0].score - top3[1].score < THRESHOLDS.margin) reason = 'ambiguous';
  if (reason) return { ...metadata, status: 'uncertain', reason, top3, oodSimilarity: similarity };
  if (!winner.conditionId || !winner.cropId) return invalid();
  return { ...metadata, status: 'accepted', conditionId: winner.conditionId, cropId: winner.cropId, score: top3[0].score, top3, oodSimilarity: similarity };
}

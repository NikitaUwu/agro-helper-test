/* Real inference runs in this same-origin worker. No user photo is uploaded. */
const REVISION = '06ebf5e308e100fd000d738c42b059ebb5f58a16';
const BASE = `/models/dinov2-small/${REVISION}/`;
const ORT_BASE = '/ort/1.30.0/';
let initialization;

async function verifiedAsset(item, requestId) {
  const url = BASE + item.path;
  let cache;
  try { cache = await caches.open(`leaf-model-${REVISION}`); } catch { /* Storage is optional. */ }
  let response = await cache?.match(url);
  let fromCache = Boolean(response);
  if (!response) response = await fetch(url);
  if (!response.ok) throw new Error(`Asset ${item.path}: HTTP ${response.status}`);
  let bytes;
  if (!fromCache && item.path === 'model.onnx' && response.body) {
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); loaded += value.byteLength;
      self.postMessage({ type: 'progress', requestId, phase: 'loading', loaded, total: item.bytes });
    }
    const joined = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    bytes = joined.buffer;
  } else bytes = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), v => v.toString(16).padStart(2, '0')).join('');
  if (hash !== item.sha256 || bytes.byteLength !== item.bytes) {
    if (fromCache) { await cache?.delete(url); return verifiedAsset(item, requestId); }
    throw new Error(`Integrity check failed: ${item.path}`);
  }
  if (!fromCache) { try { await cache?.put(url, new Response(bytes)); } catch { /* Quota is optional. */ } }
  return bytes;
}

async function initialize(requestId) {
  const started = performance.now();
  self.postMessage({ type: 'progress', requestId, phase: 'loading' });
  importScripts(ORT_BASE + 'ort.wasm.min.js');
  ort.env.wasm.wasmPaths = new URL(ORT_BASE, self.location.origin).href;
  ort.env.wasm.numThreads = 1;
  const response = await fetch(BASE + 'manifest.json');
  if (!response.ok) throw new Error('Model manifest unavailable');
  const manifest = await response.json();
  if (manifest.modelRevision !== REVISION || manifest.labelsCount !== 38 || manifest.featuresDim !== 768 || manifest.runtimeVersion !== '1.30.0') throw new Error('Model manifest mismatch');
  const asset = name => {
    const item = manifest.files.find(file => file.path === name);
    if (!item) throw new Error(`Missing model asset ${name}`);
    return verifiedAsset(item, requestId);
  };
  const [model, rawMeta, rawCentroids] = await Promise.all([asset('model.onnx'), asset('meta.json'), asset('centroids.f32')]);
  const meta = JSON.parse(new TextDecoder().decode(rawMeta));
  if (meta.dim !== 768 || meta.labels.length !== 38 || rawCentroids.byteLength !== 116736 || !Number.isFinite(meta.threshold)) throw new Error('Invalid OOD assets');
  const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return { session, meta, centroids: new Float32Array(rawCentroids), initializationMs: performance.now() - started };
}

self.onmessage = async ({ data }) => {
  if (data.type !== 'infer') return;
  const { requestId } = data;
  let phase = 'loading';
  try {
    const coldStart = !initialization;
    initialization ??= initialize(requestId).catch(error => { initialization = undefined; throw error; });
    const engine = await initialization;
    self.postMessage({ type: 'ready', requestId, meta: engine.meta, centroids: engine.centroids, initializationMs: coldStart ? engine.initializationMs : 0 });
    phase = 'analyzing';
    const pixels = new Float32Array(data.pixels);
    if (pixels.length !== 3 * 224 * 224) throw new Error('Invalid input tensor');
    self.postMessage({ type: 'progress', requestId, phase });
    const started = performance.now();
    const input = new ort.Tensor('float32', pixels, [1, 3, 224, 224]);
    const output = await engine.session.run({ pixel_values: input });
    try {
      const logits = Float32Array.from(output.logits.data);
      const features = Float32Array.from(output.features.data);
      self.postMessage({ type: 'result', requestId, logits, features, inferenceMs: performance.now() - started }, [logits.buffer, features.buffer]);
    } finally {
      input.dispose();
      for (const tensor of Object.values(output)) tensor.dispose();
    }
  } catch (error) {
    self.postMessage({ type: 'error', requestId, reason: phase === 'loading' ? 'model_load_failed' : 'inference_failed', message: error instanceof Error ? error.message : String(error) });
  }
};

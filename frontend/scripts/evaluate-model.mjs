import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { writeBenchmarkReport } from './report-benchmark.mjs';

const frontend = path.resolve(import.meta.dirname, '..');
const root = path.dirname(frontend);
const directory = path.join(root, 'data/evaluations/plantvillage-dinov2');
const manifestFile = path.join(root, 'docs/evaluations/2026-10-21-plantvillage-manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
const publicDirectory = path.join(frontend, 'public');
const mime = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
const server = http.createServer(async (request, response) => {
  try {
    if (request.url === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>Local model benchmark</title>'); return; }
    const filename = path.resolve(publicDirectory, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!filename.startsWith(publicDirectory + path.sep)) { response.writeHead(403); response.end(); return; }
    const bytes = await fs.readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream', 'Content-Length': bytes.length });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const browser = await chromium.launch({ headless: true });
const rows = [];
const errors = [];
const startedAt = new Date().toISOString();
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}`);
  const bundle = await build({ absWorkingDir: frontend, entryPoints: ['tests/browser-entry.ts'], bundle: true, format: 'iife', globalName: 'leafDiagnosis', write: false, tsconfig: 'tsconfig.json' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const version = await page.evaluate(() => ({ model: leafDiagnosis.MODEL_REVISION, policy: leafDiagnosis.POLICY_VERSION, preprocessing: leafDiagnosis.PREPROCESSING_VERSION }));
  const analyze = async (sample, requestId) => {
    const bytes = await fs.readFile(path.join(root, sample.file));
    if (createHash('sha256').update(bytes).digest('hex') !== sample.sha256) throw new Error('Image hash mismatch');
    return page.evaluate(async ({ base64, cropId, requestId }) => {
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      const image = new Blob([bytes], { type: 'image/jpeg' });
      const started = performance.now();
      const outcome = await leafDiagnosis.analyzeLeaf({ requestId, image, selectedCropId: cropId, source: 'upload' }, () => {}, new AbortController().signal);
      return { outcome, totalMs: performance.now() - started };
    }, { base64: bytes.toString('base64'), cropId: sample.trueCropId, requestId });
  };
  const warmup = await analyze(manifest.samples[0], 'cold-start');
  if (warmup.outcome.status === 'error') throw new Error(JSON.stringify(warmup.outcome));
  for (const sample of manifest.samples) {
    const result = await analyze(sample, `eval-${sample.run}-${rows.length}`);
    rows.push({ imageId: sample.imageId, trueConditionId: sample.trueConditionId, trueCropId: sample.trueCropId, run: sample.run,
      sha256: sample.sha256, ...result,
      top1Correct: ['accepted', 'uncertain'].includes(result.outcome.status) && result.outcome.top3[0].conditionId === sample.trueConditionId,
      top3Correct: ['accepted', 'uncertain'].includes(result.outcome.status) && result.outcome.top3.some(item => item.conditionId === sample.trueConditionId),
    });
    if (rows.length % 35 === 0) console.log(`Evaluated ${rows.length}/${manifest.samples.length}`);
  }
  const negative = await page.evaluate(async () => {
    const outcomes = [];
    for (const [index, color] of ['#000000', '#ffffff', '#128aff', '#e22b3d', '#22aa44'].entries()) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 256, 256);
      const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const outcome = await leafDiagnosis.analyzeLeaf({ requestId: `negative-${index}`, image, selectedCropId: 'tomato', source: 'upload' }, () => {}, new AbortController().signal);
      outcomes.push({ case: color, status: outcome.status, reason: outcome.reason });
    }
    return outcomes;
  });
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const percentile = (values, p) => [...values].sort((a, b) => a-b)[Math.ceil(values.length*p)-1];
  const summarize = values => {
    const accepted = values.filter(row => row.outcome.status === 'accepted');
    return { count: values.length, correctTop1: values.filter(row => row.top1Correct).length,
      top1Accuracy: mean(values.map(row => Number(row.top1Correct))), top3Accuracy: mean(values.map(row => Number(row.top3Correct))),
      acceptedCount: accepted.length, acceptedCorrect: accepted.filter(row => row.top1Correct).length,
      acceptedPrecision: mean(accepted.map(row => Number(row.top1Correct))), coverage: accepted.length/values.length,
      meanInferenceMs: mean(values.filter(row => 'inferenceMs' in row.outcome).map(row => row.outcome.inferenceMs)),
      meanTotalMs: mean(values.map(row => row.totalMs)), p50TotalMs: percentile(values.map(row => row.totalMs), .5), p95TotalMs: percentile(values.map(row => row.totalMs), .95),
      errorCount: values.filter(row => row.outcome.status === 'error').length,
    };
  };
  const metrics = { startedAt, finishedAt: new Date().toISOString(), version,
    environment: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, node: process.version, browser: browser.version(), backend: 'WASM, 1 thread, no GPU', datasetManifestSha256: createHash('sha256').update(await fs.readFile(manifestFile)).digest('hex') },
    limitations: [manifest.limitation, 'Training/test split membership unknown; no independent field accuracy claim.', 'Cold model download uses localhost, not mobile internet.', 'Desktop host measurements; mobile hardware and Safari not measured.', 'Latency excludes file selection, React rendering and journal write; includes decode, preprocessing, inference and decision policy.', 'Synthetic negatives are not an unknown-disease validation set.'],
    coldStart: { totalMs: warmup.totalMs, initializationMs: warmup.outcome.initializationMs, inferenceMs: warmup.outcome.inferenceMs },
    overall: summarize(rows), runs: [1,2,3].map(run => ({ run, ...summarize(rows.filter(row => row.run === run)) })),
    crops: [...new Set(rows.map(row => row.trueCropId))].map(cropId => ({ cropId, ...summarize(rows.filter(row => row.trueCropId === cropId)) })),
    classes: [...new Set(rows.map(row => row.trueConditionId))].map(conditionId => ({ conditionId, ...summarize(rows.filter(row => row.trueConditionId === conditionId)) })),
    healthy: { acceptedHealthy: rows.filter(row => row.outcome.status === 'accepted' && row.outcome.conditionId.endsWith('_healthy')).length,
      falseHealthy: rows.filter(row => row.outcome.status === 'accepted' && row.outcome.conditionId.endsWith('_healthy') && !row.trueConditionId.endsWith('_healthy')).length },
    syntheticNegatives: negative, pageErrors: errors,
  };
  await fs.writeFile(path.join(directory, 'predictions.json'), JSON.stringify(rows, null, 2));
  await fs.writeFile(path.join(directory, 'metrics.json'), JSON.stringify(metrics, null, 2));
  const reportDirectory = path.join(root, 'docs/evaluations'); await fs.mkdir(reportDirectory, { recursive: true });
  await fs.writeFile(path.join(reportDirectory, '2026-10-21-dinov2-benchmark.json'), JSON.stringify(metrics, null, 2) + '\n');
  await fs.writeFile(path.join(reportDirectory, '2026-10-21-dinov2-predictions.json'), JSON.stringify(rows, null, 2) + '\n');
  await writeBenchmarkReport(metrics);
  console.log(JSON.stringify({ coldStart: metrics.coldStart, overall: metrics.overall, runs: metrics.runs, negative, errors }, null, 2));
  if (metrics.overall.errorCount || errors.length) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'public/models/dinov2-small/06ebf5e308e100fd000d738c42b059ebb5f58a16');
test('published benchmark preserves the exact immutable inputs and individual predictions', () => {
  const evidence = path.resolve(root, '../docs/evaluations');
  const bytes = fs.readFileSync(path.join(evidence, '2026-10-21-plantvillage-manifest.json'));
  const manifest = JSON.parse(bytes);
  const report = JSON.parse(fs.readFileSync(path.join(evidence, '2026-10-21-dinov2-benchmark.json')));
  const predictions = JSON.parse(fs.readFileSync(path.join(evidence, '2026-10-21-dinov2-predictions.json')));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), report.environment.datasetManifestSha256);
  assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(manifest.samples.length, 315);
  assert.equal(new Set(manifest.samples.map(item => item.sha256)).size, 315);
  assert.equal(predictions.length, 315);
  assert.equal(predictions.filter(item => item.top1Correct).length, report.overall.correctTop1);
  assert.equal(predictions.filter(item => item.outcome.status === 'accepted').length, report.overall.acceptedCount);
  const mean = predictions.reduce((sum, item) => sum + item.totalMs, 0) / predictions.length;
  assert.ok(Math.abs(mean - report.overall.meanTotalMs) < 1e-8);
  const counts = new Map();
  for (const [index, item] of manifest.samples.entries()) {
    assert.ok(item.sourceUrl.includes('/blob/' + manifest.sourceRevision + '/'));
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
    assert.equal(predictions[index].sha256, item.sha256);
    assert.equal(predictions[index].trueConditionId, item.trueConditionId);
    const key = item.trueConditionId + ':' + item.run;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 63);
  assert.ok([...counts.values()].every(count => count === 5));
});
test('real model package is pinned, complete, and matches its checksums', () => {
  assert.ok(fs.existsSync(path.join(directory, 'manifest.json')), 'download the pinned model package');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.labelsCount, 38);
  assert.equal(manifest.featuresDim, 768);
  assert.equal(manifest.modelRevision, '06ebf5e308e100fd000d738c42b059ebb5f58a16');
  for (const item of manifest.files) {
    const bytes = fs.readFileSync(path.join(directory, item.path));
    assert.equal(bytes.length, item.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(directory, 'meta.json'), 'utf8'));
  assert.equal(meta.labels.length, 38);
  assert.equal(meta.dim, 768);
  assert.equal(fs.statSync(path.join(directory, 'centroids.f32')).size, 38 * 768 * 4);
  assert.ok(fs.statSync(path.join(directory, 'model.onnx')).size > 20_000_000);
});

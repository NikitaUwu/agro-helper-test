import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'public/models/dinov2-small/06ebf5e308e100fd000d738c42b059ebb5f58a16');
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

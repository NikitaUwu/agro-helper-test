import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const revision = '06ebf5e308e100fd000d738c42b059ebb5f58a16';
const spaceRevision = 'b26e704bd72c2fe05632ea6f7be680a2eca0d8f5';
const runtimeVersion = '1.30.0';
const directory = path.join(root, 'public/models/dinov2-small', revision);
const modelSource = `https://huggingface.co/rodynaemad/plant-disease-dinov2-small/resolve/${revision}/`;
const spaceSource = `https://huggingface.co/spaces/rodynaemad/plant-disease-scanner/resolve/${spaceRevision}/`;
await fs.mkdir(directory, { recursive: true });
const previous = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8').catch(() => 'null'));
const definitions = [
  ['model.onnx', modelSource + 'onnx/model_with_features_quantized.onnx'],
  ['config.json', modelSource + 'config.json'],
  ['preprocessor_config.json', modelSource + 'preprocessor_config.json'],
  ['MODEL_README.md', modelSource + 'README.md'],
  ['meta.json', spaceSource + 'meta.json'],
  ['centroids.f32', spaceSource + 'centroids.f32'],
  ['SPACE_README.md', spaceSource + 'README.md'],
];
const files = [];
for (const [filename, sourceUrl] of definitions) {
  const destination = path.join(directory, filename);
  let bytes = await fs.readFile(destination).catch(() => null);
  if (!bytes) {
    console.log(`Downloading ${filename}`);
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (filename === 'model.onnx' && bytes.length < 20_000_000) throw new Error('Incomplete model download');
    await fs.writeFile(destination + '.partial', bytes);
    await fs.rename(destination + '.partial', destination);
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const expected = previous?.files.find(item => item.path === filename);
  if (expected && (expected.sha256 !== sha256 || expected.bytes !== bytes.length)) {
    throw new Error(`Integrity check failed: ${filename}. Restore the pinned asset before building.`);
  }
  files.push({ path: filename, bytes: bytes.length, sha256, sourceUrl, license: 'CC-BY-SA-4.0' });
}
const meta = JSON.parse(await fs.readFile(path.join(directory, 'meta.json'), 'utf8'));
if (meta.labels.length !== 38 || meta.dim !== 768) throw new Error('Unexpected model metadata');
await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({
  modelId: 'rodynaemad/plant-disease-dinov2-small', modelRevision: revision, spaceRevision,
  runtimeVersion, preprocessingVersion: 'canvas-rgb-short256-center224-imagenet-v1',
  labelsCount: 38, featuresDim: 768, inputShape: [1, 3, 224, 224], files,
}, null, 2) + '\n');
await fs.writeFile(path.join(directory, 'NOTICE.txt'),
  'Model and Space: Rodayna Emad Mohamed, CC BY-SA 4.0.\n' +
  'https://huggingface.co/rodynaemad/plant-disease-dinov2-small\n' +
  'https://huggingface.co/spaces/rodynaemad/plant-disease-scanner\n' +
  'License: https://creativecommons.org/licenses/by-sa/4.0/\n' +
  'Redistributed unchanged INT8 ONNX and centroid assets. UI integration is project-specific.\n' +
  'Backbone: Meta DINOv2, Apache 2.0. Training dataset: PlantVillage (Hughes and Salathe), CC BY-SA.\n');
const ortDirectory = path.join(root, 'public/ort', runtimeVersion);
await fs.mkdir(ortDirectory, { recursive: true });
for (const name of await fs.readdir(path.join(root, 'node_modules/onnxruntime-web/dist'))) {
  if (name === 'ort.wasm.min.js' || /^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(name)) {
    await fs.copyFile(path.join(root, 'node_modules/onnxruntime-web/dist', name), path.join(ortDirectory, name));
  }
}
const runtimeLicense = path.join(ortDirectory, 'LICENSE.txt');
if (!(await fs.stat(runtimeLicense).catch(() => null))) {
  const response = await fetch(`https://raw.githubusercontent.com/microsoft/onnxruntime/v${runtimeVersion}/LICENSE`);
  if (!response.ok) throw new Error(`Runtime license: HTTP ${response.status}`);
  await fs.writeFile(runtimeLicense, await response.text());
}
console.log(`Pinned package ready: ${revision}; ${files.reduce((sum, item) => sum + item.bytes, 0)} bytes`);

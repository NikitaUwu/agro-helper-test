import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const bundle = await build({ absWorkingDir: root, stdin: { contents: `
  export { DISEASES } from './src/data/diseases';
  export { CROPS } from './src/data/crops';
  export { DEMO_SAMPLES } from './src/data/demoSamples';
  export { MODEL_LABELS, ANALYSIS_CROP_IDS } from './src/lib/diagnosis/registry';
`, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, tsconfig: path.join(root, 'tsconfig.json') });
const { DISEASES, CROPS, DEMO_SAMPLES, MODEL_LABELS, ANALYSIS_CROP_IDS } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let count = 0;
const check = (condition, message) => { assert.ok(condition, message); count++; };
check(DISEASES.length === 34, '34 catalogue states including all 25 legacy IDs');
check(CROPS.length === 7, '7 knowledge crops, including cucumber and wheat');
check(ANALYSIS_CROP_IDS.length === 5, '5 photo-analysis crops');
check(MODEL_LABELS.length === 38, 'all 38 model outputs retained');
check(MODEL_LABELS.filter(item => item.enabled).length === 21, '21 supported states');
check(new Set(DISEASES.map(item => item.id)).size === DISEASES.length, 'unique condition IDs');
for (const crop of CROPS) {
  check(DISEASES.some(item => item.id === crop.healthyConditionId && item.cropId === crop.id && item.isHealthy), `${crop.id} healthy card`);
  check(crop.diseaseCount === DISEASES.filter(item => item.cropId === crop.id && !item.isHealthy).length, `${crop.id} derived count`);
}
for (const item of MODEL_LABELS.filter(item => item.enabled)) {
  check(DISEASES.some(condition => condition.id === item.conditionId && condition.cropId === item.cropId), `${item.rawLabel} resolves to the right card`);
}
for (const condition of DISEASES) {
  for (const tab of ['symptoms', 'biological', 'agrotechnical', 'chemical']) check(condition.recommendations[tab]?.length > 0, `${condition.id}: ${tab}`);
  check(condition.photos.length > 0, `${condition.id}: reference photo`);
  for (const url of condition.photos) check(fs.existsSync(path.join(root, 'public', decodeURIComponent(url))), `${condition.id}: photo exists`);
}
check(DEMO_SAMPLES.length >= 11, 'presets cover all five analysis crops');
for (const sample of DEMO_SAMPLES) {
  check(ANALYSIS_CROP_IDS.includes(sample.cropId), `${sample.id}: supported crop`);
  check(DISEASES.some(item => item.id === sample.expectedConditionId && item.cropId === sample.cropId), `${sample.id}: labelled ground truth`);
  check(sample.confidence === undefined, `${sample.id}: no fabricated score`);
  check(fs.existsSync(path.join(root, 'public', decodeURIComponent(sample.imagePath))), `${sample.id}: file exists`);
}
const header = fs.readFileSync(path.join(root, 'src/components/layout/Header.tsx'), 'utf8');
check(!header.includes('Plantix AI'), 'project branding retained');
check(header.includes('Агро ИИ'), 'Russian header retained');
console.log(`PASS: ${count}/${count} catalogue, asset, mapping and scenario structure checks.`);
console.log('Runtime behavior is covered separately by test:unit, test:e2e and test:model.');

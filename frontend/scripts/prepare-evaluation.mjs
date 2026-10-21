// Deterministic, class-balanced integration benchmark. PlantVillage is training-domain data.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await fs.readFile(path.join(root, 'config/model_labels.json'), 'utf8'));
const sourceCommit = 'master';
const directory = path.join(root, 'data/evaluations/plantvillage-dinov2');
await fs.mkdir(directory, { recursive: true });
const active = registry.labels.filter(item => item.enabled);
const samples = [];
const gallery = {};
const attribution = [];
async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response;
    } catch (error) { lastError = error; }
  }
  throw lastError;
}
for (const item of active) {
  const filename = path.join(directory, `listing-${item.index}.json`);
  let listing;
  try { listing = JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch {
    const url = `https://api.github.com/repos/spMohanty/PlantVillage-Dataset/contents/raw/color/${encodeURIComponent(item.rawLabel)}?ref=${sourceCommit}`;
    const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'AgronomistAssistant-evaluation' } });
    if (!response.ok) throw new Error(`Listing ${item.rawLabel}: HTTP ${response.status}`);
    listing = await response.json();
    await fs.writeFile(filename, JSON.stringify(listing));
  }
  const files = listing.filter(file => file.type === 'file').sort((a, b) => {
    const hash = value => createHash('sha256').update('dinov2-pilot-v1:' + value).digest('hex');
    return hash(a.name).localeCompare(hash(b.name));
  }).slice(0, 17);
  gallery[item.conditionId] = [];
  const download = async (file, index) => {
    const isGallery = index >= 15;
    const relative = isGallery ? `frontend/public/data/dinov2/${item.conditionId}/${file.name}` : `data/evaluations/plantvillage-dinov2/images/${item.conditionId}/${file.name}`;
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    let bytes = await fs.readFile(destination).catch(() => null);
    if (!bytes) {
      const response = await fetchWithRetry(file.download_url);
      if (!response.ok) throw new Error(`${file.name}: HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(destination, bytes);
    }
    const entry = {
      imageId: file.name, trueConditionId: item.conditionId, trueCropId: item.cropId,
      modelIndex: item.index, file: relative, sha256: createHash('sha256').update(bytes).digest('hex'),
      sourceUrl: file.html_url, sourceBlobSha: file.sha, license: 'CC-BY-SA-3.0',
      attribution: 'PlantVillage — David P. Hughes and Marcel Salathé; original filename retained',
      trainingOverlap: 'possible; model trained on full PlantVillage domain, author split membership unknown',
    };
    if (isGallery) {
      const publicPath = encodeURI(relative.replace('frontend/public', ''));
      gallery[item.conditionId].push(publicPath);
      attribution.push({ ...entry, publicPath });
    } else samples.push({ ...entry, run: Math.floor(index / 5) + 1 });
  };
  for (let start = 0; start < files.length; start += 4) {
    await Promise.all(files.slice(start, start + 4).map((file, offset) => download(file, start + offset)));
  }
  console.log(`${item.conditionId}: ${files.length - 2} benchmark + 2 gallery photos`);
}
samples.sort((a,b) => a.run-b.run || a.modelIndex-b.modelIndex || a.imageId.localeCompare(b.imageId));
for (const photos of Object.values(gallery)) photos.sort();
await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify({
  dataset: 'PlantVillage', selection: 'SHA256-sorted filename, seed dinov2-pilot-v1, 15 evaluation + 2 gallery per class',
  limitation: 'Integration/domain benchmark only; not an independent field accuracy estimate.',
  samples,
}, null, 2));
await fs.writeFile(path.join(root, 'frontend/src/data/modelPhotos.json'), JSON.stringify(gallery, null, 2) + '\n');
await fs.writeFile(path.join(root, 'frontend/public/data/dinov2-attribution.json'), JSON.stringify(attribution, null, 2) + '\n');
console.log(`Prepared ${samples.length} benchmark photos across ${active.length} classes in three disjoint runs.`);

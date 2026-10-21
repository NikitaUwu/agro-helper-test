// Restore the recorded benchmark; never reselect inputs from a mutable branch.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../..');
const frozen = path.join(root, 'docs/evaluations/2026-10-21-plantvillage-manifest.json');
const manifestBytes = await fs.readFile(frozen);
const manifest = JSON.parse(manifestBytes);
const gallery = JSON.parse(await fs.readFile(path.join(root, 'frontend/public/data/dinov2-attribution.json'), 'utf8'));
if (!/^[a-f0-9]{40}$/.test(manifest.sourceRevision)) throw new Error('Immutable dataset revision required');
const entries = [...manifest.samples, ...gallery];
async function restore(entry) {
  const source = new URL(entry.sourceUrl);
  const prefix = `/spMohanty/PlantVillage-Dataset/blob/${manifest.sourceRevision}/`;
  if (source.hostname !== 'github.com' || !source.pathname.startsWith(prefix)) throw new Error('Unpinned image source');
  const filename = path.resolve(root, entry.file);
  if (!filename.startsWith(root + path.sep)) throw new Error('Image path outside project');
  const valid = bytes => {
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    return sha256 === entry.sha256 && blob === entry.sourceBlobSha;
  };
  const cached = await fs.readFile(filename).catch(() => null);
  if (cached && valid(cached)) return;
  const url = `https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/${manifest.sourceRevision}/${source.pathname.slice(prefix.length)}`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!valid(bytes)) throw new Error(`Image integrity mismatch: ${entry.imageId}`);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, bytes);
      return;
    } catch (error) { lastError = error; }
  }
  throw lastError;
}
for (let start = 0; start < entries.length; start += 4) {
  await Promise.all(entries.slice(start, start + 4).map(restore));
}
const directory = path.join(root, 'data/evaluations/plantvillage-dinov2');
await fs.mkdir(directory, { recursive: true });
await fs.writeFile(path.join(directory, 'manifest.json'), manifestBytes);
console.log(`Verified/restored ${manifest.samples.length} benchmark + ${gallery.length} gallery photos at ${manifest.sourceRevision}.`);

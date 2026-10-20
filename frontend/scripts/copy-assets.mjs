import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const srcDir = path.join(projectRoot, 'data', 'downloads', 'plantvillage');
const destDataDir = path.join(__dirname, '..', 'public', 'data', 'plantvillage');
const destSamplesDir = path.join(__dirname, '..', 'public', 'samples');

if (!fs.existsSync(srcDir)) {
  console.error(`[copy-assets] Source directory not found: ${srcDir}`);
  process.exit(1);
}

fs.mkdirSync(destDataDir, { recursive: true });
fs.mkdirSync(destSamplesDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(srcDir, destDataDir);
copyRecursiveSync(srcDir, destSamplesDir);

console.log(`[copy-assets] Successfully copied PlantVillage dataset to:\n- ${destDataDir}\n- ${destSamplesDir}`);

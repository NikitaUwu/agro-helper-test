import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let bundle: string;
test.beforeAll(async () => {
  const result = await build({ entryPoints: ['tests/browser-entry.ts'], bundle: true, format: 'iife', globalName: 'leafDiagnosis', write: false, tsconfig: 'tsconfig.json' });
  bundle = result.outputFiles[0].text;
});

test('real Canvas preprocessing preserves channels, center crop and ImageNet scaling', async ({ page }) => {
  await page.goto('/'); await page.addScriptTag({ content: bundle });
  const output = await page.evaluate(async () => {
    const engine = (window as any).leafDiagnosis;
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'blue'; context.fillRect(0, 0, 512, 256);
    context.fillStyle = 'red'; context.fillRect(128, 0, 256, 256);
    const bitmap = await createImageBitmap(canvas);
    const tensor = engine.preprocessImage(bitmap); bitmap.close();
    const whiteCanvas = document.createElement('canvas'); whiteCanvas.width = whiteCanvas.height = 256;
    const transparent = await createImageBitmap(whiteCanvas);
    const white = engine.preprocessImage(transparent); transparent.close();
    const jpeg = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/jpeg'));
    const thumbnail = await engine.createJournalThumbnail(jpeg);
    let svgRejected = false;
    try { await engine.validateImage(new Blob(['<svg/>'], { type: 'image/svg+xml' })); } catch { svgRejected = true; }
    let badRejected = false;
    try { await engine.validateImage(new Blob(['broken'], { type: 'image/jpeg' })); } catch { badRejected = true; }
    return { length: tensor.length, first: tensor[0], green: tensor[224*224], blue: tensor[224*224*2], white: white[0], thumbnailBytes: thumbnail.length*0.75, svgRejected, badRejected };
  });
  expect(output.length).toBe(3*224*224);
  expect(output.first).toBeCloseTo((1-0.485)/0.229, 5);
  expect(output.green).toBeCloseTo(-0.456/0.224, 5);
  expect(output.blue).toBeCloseTo(-0.406/0.225, 5);
  expect(output.white).toBeCloseTo((1-0.485)/0.229, 5);
  expect(output.thumbnailBytes).toBeLessThan(80*1024);
  expect(output.svgRejected && output.badRejected).toBe(true);
});

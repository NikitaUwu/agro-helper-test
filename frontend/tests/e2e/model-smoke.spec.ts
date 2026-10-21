import { test, expect } from '@playwright/test';

test('real WASM worker returns 38 logits and 768 features without a server API', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => new Promise<{ logits: number; features: number; inferenceMs: number }>((resolve, reject) => {
    const worker = new Worker('/diagnosis.worker.js');
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Model timed out')); }, 75_000);
    worker.onerror = event => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); };
    worker.onmessage = ({ data }) => {
      if (data.type === 'error') { clearTimeout(timeout); worker.terminate(); reject(new Error(data.message)); }
      if (data.type === 'result') {
        clearTimeout(timeout); worker.terminate();
        resolve({ logits: data.logits.length, features: data.features.length, inferenceMs: data.inferenceMs });
      }
    };
    const pixels = new Float32Array(3 * 224 * 224);
    worker.postMessage({ type: 'infer', requestId: 'smoke', pixels: pixels.buffer }, [pixels.buffer]);
  }));
  expect(result.logits).toBe(38);
  expect(result.features).toBe(768);
  expect(result.inferenceMs).toBeGreaterThan(0);
});

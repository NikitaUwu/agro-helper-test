import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

test('real uploaded leaf is analyzed locally and its thumbnail survives a reload', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/');
  if (process.env.EVIDENCE_DIR) {
    await fs.mkdir(process.env.EVIDENCE_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, 'dinov2-home.png'), fullPage: false });
  }
  await page.getByLabel('Культура для анализа').selectOption('tomato');
  await page.getByLabel('Загрузка фотографии растения').setInputFiles(path.resolve('public/data/plantvillage/Tomato___Late_blight/0003faa8-4b27-4c65-bf42-6d9e352ca1a5___RS_Late.B 4946.JPG'));
  await expect(page.getByRole('heading', { name:'Фитофтороз томатов',exact:true })).toBeVisible({ timeout:60_000 });
  if (process.env.EVIDENCE_DIR) await page.screenshot({ path: path.join(process.env.EVIDENCE_DIR, 'dinov2-result.png'), fullPage: false });
  expect(await page.locator('main img').first().getAttribute('src')).toMatch(/^blob:/);
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('agronomist_field_journal_v1')!));
  expect(records).toHaveLength(1);
  expect(records[0].origin).toBe('model_upload');
  expect(records[0].score).toBeGreaterThanOrEqual(.85);
  expect(records[0].imageSrc).toMatch(/^data:image\/jpeg;base64,/);
  expect(records[0].imageSrc.length*.75).toBeLessThan(80*1024);
  expect(posts).toEqual([]);
  await page.reload();
  await page.getByRole('tab', { name:/Полевой журнал/ }).click();
  await expect(page.getByText('Экспериментальный анализ', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Открыть заключение',exact:true}).click();
  await expect(page.getByRole('heading', { name:'Фитофтороз томатов',exact:true })).toBeVisible();
});

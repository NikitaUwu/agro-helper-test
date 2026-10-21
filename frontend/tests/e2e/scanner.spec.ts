import { test, expect } from '@playwright/test';

const transport = (winner = 30, delay = 0) => `self.onmessage = ({data}) => {
  const logits = new Float32Array(38); logits[${winner}] = 12;
  const features = new Float32Array(768); features[0] = 1;
  const centroids = new Float32Array(38*768); for(let i=0;i<38;i++) centroids[i*768]=1;
  self.postMessage({type:'ready',requestId:data.requestId,meta:{},centroids,initializationMs:12});
  self.postMessage({type:'progress',requestId:data.requestId,phase:'analyzing'});
  setTimeout(()=>self.postMessage({type:'result',requestId:data.requestId,logits,features,inferenceMs:123}),${delay});
}`;

test('offers exactly five analysis crops and uses a genuine result for a preset', async ({ page }) => {
  await page.route('**/diagnosis.worker.js', route => route.fulfill({ contentType: 'application/javascript', body: transport() }));
  await page.goto('/');
  const choices = page.getByLabel('Культура для анализа');
  await expect(choices.locator('option')).toHaveCount(6);
  await expect(choices).toContainText('Сладкий перец');
  await expect(choices).toContainText('Земляника');
  await expect(page.getByText('за 2 секунды')).toHaveCount(0);
  await page.getByRole('button', { name: /Томат: Фитофтороз/ }).click();
  await expect(page.getByRole('heading', { name: 'Фитофтороз томатов', exact: true })).toBeVisible();
  await expect(page.getByText('Оценка модели', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Полевой журнал/ }).click();
  await expect(page.getByText('Тестовый образец', { exact: true })).toBeVisible();
});

test('unsupported winner is a refusal and does not create a diagnosis or journal row', async ({ page }) => {
  await page.route('**/diagnosis.worker.js', route => route.fulfill({ contentType: 'application/javascript', body: transport(4) }));
  await page.goto('/');
  await page.getByRole('button', { name: /Томат: Фитофтороз/ }).click();
  await expect(page.getByText('Этот вариант не входит в поддерживаемые состояния.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Полевой журнал/ }).click();
  await expect(page.getByText('Журнал пока пуст', { exact: true })).toBeVisible();
});

test('cancelled request cannot produce a late result or saved record', async ({ page }) => {
  await page.route('**/diagnosis.worker.js', route => route.fulfill({ contentType: 'application/javascript', body: transport(30, 1000) }));
  await page.goto('/');
  const created = page.waitForEvent('worker');
  await page.getByRole('button', { name: /Томат: Фитофтороз/ }).click();
  const worker = await created;
  const closed = worker.waitForEvent('close');
  await page.getByRole('button', { name: 'Отменить сканирование' }).click();
  await closed;
  await expect(page.getByRole('heading', { name: 'Проверьте лист растения по фото' })).toBeVisible();
  await page.getByRole('tab', { name: /Полевой журнал/ }).click();
  await expect(page.getByText('Журнал пока пуст', { exact: true })).toBeVisible();
});

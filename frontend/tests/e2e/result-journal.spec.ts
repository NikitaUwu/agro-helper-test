import { test, expect } from '@playwright/test';

const successWorker = `self.onmessage=({data})=>{
  const logits=new Float32Array(38);logits[30]=12;
  const features=new Float32Array(768);features[0]=1;
  const centroids=new Float32Array(38*768);for(let i=0;i<38;i++)centroids[i*768]=1;
  self.postMessage({type:'ready',requestId:data.requestId,centroids,initializationMs:0});
  self.postMessage({type:'result',requestId:data.requestId,logits,features,inferenceMs:123});
}`;

test('catalog hides unsupported crops and supported knowledge cards do not invent model scores', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Справочник', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Огурец', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Пшеница', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Все (24)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Картофель', exact: true }).click();
  await page.getByRole('heading', { name: 'Фитофтороз картофеля', exact: true }).click();
  await expect(page.getByText('Оценка модели', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: /Полевой журнал/ }).click();
  await expect(page.getByText('Журнал пока пуст', { exact: true })).toBeVisible();
});

test('catalog search and every crop filter use only the five recognized plants', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', {name:'Справочник',exact:true}).click();
  const search = page.getByPlaceholder('Поиск по болезни, культуре или возбудителю...');
  for (const query of ['огур', 'пшениц']) {
    await search.fill(query);
    await expect(page.getByText(`Ничего не найдено по запросу «${query}».`, {exact:true})).toBeVisible();
    await expect(page.getByRole('heading', {level:4})).toHaveCount(0);
  }
  await search.fill('');
  for (const [crop, count] of [['Томат',10],['Картофель',5],['Яблоня',5],['Сладкий перец',2],['Земляника',2]] as const) {
    await page.getByRole('button', {name:crop,exact:true}).click();
    await expect(page.getByRole('heading', {level:4})).toHaveCount(count);
  }
  await page.getByRole('button', {name:'Все (24)',exact:true}).click();
  await expect(page.getByRole('heading', {level:4})).toHaveCount(24);
});

test('legacy history preserves crop and condition while hiding fabricated confidence', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agronomist_field_journal_v1', JSON.stringify([{
    id:'legacy', timestamp:'2026-10-19T10:00:00Z', formattedDateRu:'19 окт.', cropId:'wheat', cropNameRu:'Пшеница',
    conditionId:'wheat_stripe_rust', conditionNameRu:'Жёлтая ржавчина', risk:'critical',riskLabelRu:'Критично',confidence:99.9,imageSrc:'/data/catalog/wheat_stripe_rust_1.jpg',
  }])));
  await page.goto('/');
  await page.getByRole('tab', { name: /Полевой журнал/ }).click();
  await expect(page.getByText('Старая демонстрационная запись', { exact: true })).toBeVisible();
  await expect(page.getByText('99.9%')).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть заключение', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Жёлтая (полосатая) ржавчина пшеницы', exact: true })).toBeVisible();
  await expect(page.getByText('Оценка модели', { exact: true })).toHaveCount(0);
});

test('full localStorage reports a failed save while preserving the analysis', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('full','QuotaExceededError'); }; });
  await page.route('**/diagnosis.worker.js', route => route.fulfill({ contentType:'application/javascript',body:successWorker }));
  await page.goto('/');
  await page.getByRole('button', { name: /Томат: Фитофтороз/ }).click();
  await expect(page.getByRole('heading', { name:'Фитофтороз томатов',exact:true })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'хранилище заполнено' })).toContainText('хранилище заполнено');
  await expect(page.getByRole('button', { name:'В журнале',exact:true })).toHaveCount(0);
  await page.getByRole('tab', { name:/Полевой журнал/ }).click();
  await expect(page.getByText('Журнал пока пуст', { exact:true })).toBeVisible();
});

test('model network failure is actionable and does not replace the image with a canned diagnosis', async ({ page }) => {
  await page.route('**/diagnosis.worker.js', route => route.fulfill({ contentType:'application/javascript',body:`self.onmessage=({data})=>self.postMessage({type:'error',requestId:data.requestId,reason:'model_load_failed'});` }));
  await page.goto('/');
  await page.getByRole('button', { name:/Томат: Фитофтороз/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Не удалось загрузить модель' })).toContainText('Не удалось загрузить модель');
  await page.getByRole('tab', { name:'Справочник',exact:true }).click();
  await expect(page.getByRole('heading', { name:'Справочник культур и патогенов',exact:true })).toBeVisible();
});

test('upload validates file contents; selecting the same corrupt JPEG can be retried', async ({ page }) => {
  await page.goto('/');
  for (let attempt=0;attempt<2;attempt++) {
    await page.getByLabel('Загрузка фотографии растения').setInputFiles({name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not a JPEG')});
    await expect(page.getByRole('alert').filter({ hasText: 'Не удалось открыть фотографию' })).toContainText('Не удалось открыть фотографию');
  }
});

test('responsive layout keeps the three tabs and avoids horizontal overflow', async ({ page }) => {
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:844}); await page.goto('/');
    await expect(page.getByRole('tab')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('tab', { name:'Справочник',exact:true }).click();
    await expect(page.getByRole('button',{name:'Сладкий перец',exact:true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

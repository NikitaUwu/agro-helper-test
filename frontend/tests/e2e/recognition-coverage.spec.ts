import { test, expect } from '@playwright/test';
import { DISEASES } from '../../src/data/diseases';
import { MODEL_LABELS } from '../../src/lib/diagnosis/registry';

test('recognition coverage explains exactly the supported states without starting analysis', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', request => {
    if (/\/models\/|\/diagnosis\.worker\.js/.test(request.url())) modelRequests.push(request.url());
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const coverage = page.locator('details').filter({ has: page.getByText('Что распознаёт анализ', { exact: true }) });
  await expect(coverage).toBeVisible();
  await expect(coverage).not.toHaveAttribute('open');
  await expect(coverage).toContainText('5 культур · 21 состояние');
  const summary = coverage.locator('summary').first();
  await summary.focus();
  await summary.press('Enter');
  await expect(coverage).toHaveAttribute('open');

  for (const [crop, count] of [['Томат', 10], ['Картофель', 3], ['Яблоня', 4], ['Сладкий перец', 2], ['Земляника', 2]] as const) {
    const group = coverage.locator('details').filter({ has: page.getByText(crop, { exact: true }) });
    await group.locator('summary').click();
    const list = group.getByRole('list', { name: `Распознаваемые состояния: ${crop}` });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem')).toHaveCount(count);
    await expect(list.getByText('Лист без характерных поражений', { exact: true })).toBeVisible();
  }
  await expect(coverage.getByText('Повреждение паутинным клещом', { exact: true })).toBeVisible();
  await expect(coverage).not.toContainText('Мучнистая роса яблони');
  await expect(coverage).not.toContainText('Огурец и пшеница доступны только в справочнике');
  await expect(coverage).toContainText('Скрытые инфекции и здоровье всего растения по одному листу не оцениваются');
  const expectedNames = MODEL_LABELS.filter(label => label.enabled).map(label => {
    const condition = DISEASES.find(item => item.id === label.conditionId)!;
    return condition.isHealthy ? 'Лист без характерных поражений' : condition.nameRu;
  });
  const displayedNames = await coverage.getByRole('listitem').allTextContents();
  expect(displayedNames.map(name => name.replace('· вредитель', '').trim()).sort()).toEqual(expectedNames.sort());
  expect(modelRequests).toEqual([]);
  await expect(page.getByLabel('Культура для анализа')).toHaveCount(0);
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

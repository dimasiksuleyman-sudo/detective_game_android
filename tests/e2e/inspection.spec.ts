import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => {
    if (d.message().includes('не использовали действия')) void d.accept();
  });
});
async function click(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
}
async function hold(page: Page) {
  await expect(
    page.getByRole('heading', { name: /^Передайте телефон:/ }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: /^Детектив \d$/ })
    .dispatchEvent('pointerdown');
  await expect(
    page.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
}
async function start(page: Page, count = 1) {
  await page.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1'
      ? r.continue()
      : r.abort(),
  );
  await page.goto('/');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await page
    .getByRole('combobox', { name: 'Количество игроков', exact: true })
    .selectOption(String(count));
  await click(page, 'К брифингу');
  await click(page, 'Начать расследование');
  if (count > 1) await hold(page);
  await expect(
    page.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
}
async function saved(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('keyval-store');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return new Promise<{
      version: number;
      state: {
        current: number;
        action: { used: number };
        players: {
          facts: string[];
          inspectedDetails: string[];
          score: number;
        }[];
      };
    }>((resolve, reject) => {
      const r = db
        .transaction('keyval')
        .objectStore('keyval')
        .get('interrogation-save-v1');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  });
}
test('предмет → самостоятельный осмотр → факт, без подсказки/расхода/повтора; восстановление', async ({
  page,
}, info) => {
  await start(page);
  await click(page, 'Пол у стола');
  await expect(
    page.getByRole('heading', { name: 'Бронзовая статуэтка', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText('скол');
  const image = page.getByRole('img', {
    name: 'Бронзовая статуэтка',
    exact: true,
  });
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(1024);
  const before = await saved(page);
  expect(before.state.players[0]?.facts).not.toContain('f-statuette-weapon');
  await image.click({ position: { x: 20, y: 20 } });
  await click(page, 'Увеличить');
  await expect(
    page.getByLabel('Масштаб изображения', { exact: true }),
  ).toHaveText('150%');
  const region = page.getByRole('button', {
    name: 'Осмотреть участок 1',
    exact: true,
  });
  expect(
    await region.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({
    path: `test-results/screens/inspection/${info.project.name}-before.png`,
    fullPage: true,
  });
  await region.click();
  await expect(
    page.getByText('Наблюдение добавлено в блокнот.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('свежий скол');
  const after = await saved(page);
  expect(after.version).toBe(3);
  expect(after.state.players[0]?.facts).toContain('f-statuette-weapon');
  expect(after.state.action.used).toBe(before.state.action.used);
  expect(after.state.players[0]?.score).toBe(before.state.players[0]?.score);
  await region.click();
  expect((await saved(page)).state.players[0]?.inspectedDetails).toEqual([
    'd-statuette-chip',
  ]);
  await page.screenshot({
    path: `test-results/screens/inspection/${info.project.name}-found.png`,
    fullPage: true,
  });
  await page.reload();
  await hold(page);
  await click(page, 'Блокнот');
  await click(page, 'Бронзовая статуэтка');
  await expect(page.locator('main')).toContainText('свежий скол');
  await click(page, 'Назад');
  await expect(
    page.getByRole('heading', { name: 'Блокнот', exact: true }),
  ).toBeVisible();
});
test('из блокнота открывается нужная улика без чужого closeup, возврат в блокнот', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Письменный стол');
  await expect(
    page.getByRole('heading', { name: 'Ежедневник Аркадия', exact: true }),
  ).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Пол у стола');
  await expect(
    page.getByRole('heading', { name: 'Бронзовая статуэтка', exact: true }),
  ).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await click(page, 'Ежедневник Аркадия');
  await expect(
    page.getByRole('heading', { name: 'Ежедневник Аркадия', exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src*="h-floor"]')).toHaveCount(0);
  await click(page, 'Назад');
  await expect(
    page.getByRole('heading', { name: 'Блокнот', exact: true }),
  ).toBeVisible();
  expect((await saved(page)).state.action.used).toBe(2);
});
test('публикация предмета не открывает скол другому игроку', async ({
  page,
}) => {
  await start(page, 2);
  await click(page, 'Пол у стола');
  await page
    .getByRole('button', { name: 'Осмотреть участок 1', exact: true })
    .click();
  await expect(
    page.getByText('Наблюдение добавлено в блокнот.', { exact: true }),
  ).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await page
    .getByRole('article')
    .filter({
      has: page.getByRole('button', {
        name: 'Бронзовая статуэтка',
        exact: true,
      }),
    })
    .getByRole('button', { name: 'Выложить на общую доску', exact: true })
    .click();
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await hold(page);
  await click(page, 'Общая доска');
  await expect(page.locator('main')).not.toContainText('скол');
  await click(page, 'Назад');
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Пол у стола');
  await expect(
    page.getByRole('heading', { name: 'Бронзовая статуэтка', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText('скол');
  const state = await saved(page);
  expect(state.state.players[0]?.inspectedDetails).toEqual([
    'd-statuette-chip',
  ]);
  expect(state.state.players[1]?.inspectedDetails).toEqual([]);
  await page
    .getByRole('button', { name: 'Осмотреть участок 1', exact: true })
    .click();
  await expect(
    page.getByText('Наблюдение добавлено в блокнот.', { exact: true }),
  ).toBeVisible();
  expect((await saved(page)).state.players[1]?.inspectedDetails).toEqual([
    'd-statuette-chip',
  ]);
});

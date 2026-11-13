import { test, expect, type Page } from '@playwright/test';
import { enterSafeCode } from './safeHelpers';
import { caseSchema } from '../../src/content/schema';
import { validateCase } from '../../src/content/validate';
import type { GameState } from '../../src/game/engine';
const click = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true }).click();
async function start(p: Page) {
  await p.goto('/');
  await click(p, 'Новое дело');
  await click(p, 'Синяя сова');
  await click(p, 'К брифингу');
  await click(p, 'Начать расследование');
}
async function safe(p: Page) {
  await click(p, 'Обыск');
  await click(p, 'Кабинет');
  await p.getByRole('button', { name: /^Сейф(?: ✓)?$/ }).click();
}
async function state(p: Page): Promise<{ version: number; state: GameState }> {
  return p.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('keyval-store');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const req = db
        .transaction('keyval')
        .objectStore('keyval')
        .get('interrogation-save-v1');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}
async function exitSafeItem(p: Page) {
  await click(p, 'К содержимому сейфа');
  await click(p, 'Назад');
  await click(p, 'Назад');
  await click(p, 'Назад');
}
async function accuse(p: Page) {
  await click(p, 'Обвинить');
  await p
    .getByRole('combobox', { name: 'Виновный', exact: true })
    .selectOption('s-gleb');
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-embezzlement');
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-statuette');
  await click(p, 'Далее');
  await p
    .getByRole('checkbox', {
      name: 'Переводы в бухгалтерии подписывал Г. Соколов.',
      exact: true,
    })
    .check();
  await click(p, 'Предъявить обвинение');
  await expect(
    p.getByRole('heading', { name: 'Как всё было', exact: true }),
  ).toBeVisible();
  await expect(p.getByText('Победители: Детектив 1')).toBeVisible();
}

test('неверный код бесплатен, верный работает без фактов, предметы не выдаются автоматически', async ({
  page,
}) => {
  await start(page);
  await safe(page);
  await click(page, 'Открыть сейф');
  await expect(page.getByRole('status')).toHaveText('Не подходит.');
  let s = await state(page);
  expect(s.state.action).toBeNull();
  expect(s.state.players[0]?.clues).toEqual([]);
  await expect(page.getByRole('spinbutton')).toHaveCount(4);
  await enterSafeCode(page);
  await expect(
    page.getByRole('heading', { name: 'Содержимое сейфа', exact: true }),
  ).toBeVisible();
  s = await state(page);
  expect(s.state.players[0]?.facts).toEqual([]);
  expect(s.state.players[0]?.clues).toEqual([]);
  expect(s.state.action?.used).toBe(1);
  await expect(
    page.locator('audio[data-sound-id="safe-open"]'),
  ).toHaveAttribute('src', '/audio/sfx/safe-open.mp3');
  for (const [i, name] of [
    'Тайная бухгалтерия',
    'Конверт с наличными',
    'Черновик завещания',
    'Визитка юриста',
  ].entries()) {
    await click(page, 'Осмотреть предмет ' + (i + 1));
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await click(page, 'К содержимому сейфа');
  }
  s = await state(page);
  expect(s.state.players[0]?.clues).toHaveLength(4);
  expect(s.state.action?.used).toBe(1);
  expect(s.state.players[0]?.facts).not.toContain('f-ledger-signature');
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-safe-interior.png`,
    fullPage: true,
  });
});

test('колёсики доступны с клавиатуры, тапом и свайпом; ошибка не уводит фокус', async ({
  page,
}) => {
  await start(page);
  await safe(page);
  const w = page.getByRole('spinbutton', { name: 'Колёсико 1', exact: true });
  await w.focus();
  await w.press('ArrowDown');
  await expect(w).toHaveAttribute('aria-valuenow', '9');
  await w.press('Home');
  const b = await w.boundingBox();
  if (!b) throw new Error('wheel');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.2);
  await page.mouse.up();
  await expect(w).toHaveAttribute('aria-valuenow', '1');
  await w.click();
  await expect(w).toHaveAttribute('aria-valuenow', '2');
  await click(page, 'Открыть сейф');
  await expect(page.getByRole('status')).toHaveText('Не подходит.');
  await w.focus();
  await w.press('ArrowUp');
  await expect(w).toBeFocused();
  await expect(w).toHaveAttribute('aria-valuenow', '3');
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-safe-lock.png`,
    fullPage: true,
  });
});

test('подпись открывает факт, только затем бухгалтерия ломает Глеба', async ({
  page,
}) => {
  await start(page);
  await safe(page);
  await enterSafeCode(page);
  await click(page, 'Осмотреть предмет 1');
  await expect(page.locator('[data-template="ledger"]')).not.toContainText(
    'Соколов',
  );
  await exitSafeItem(page);
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  await page
    .getByRole('combobox', { name: 'Тон', exact: true })
    .selectOption('pressure');
  await click(page, 'Где вы были после 23:00?');
  await click(page, 'Как идут дела у бара?');
  await page
    .getByRole('combobox', { name: 'Тон', exact: true })
    .selectOption('neutral');
  await click(page, 'Тайная бухгалтерия');
  expect((await state(page)).state.players[0]?.truths).not.toContain('t-money');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await click(page, 'Тайная бухгалтерия');
  const image = page.getByRole('img', {
    name: 'Тайная бухгалтерия',
    exact: true,
  });
  await image.evaluate((el: HTMLImageElement) => el.decode());
  await image.screenshot({
    path: `test-results/screens/${test.info().project.name}-ledger-paper.png`,
  });
  // Регрессия замечания владельца: строки остаются на бумаге и не обрезаются при масштабировании.
  for (const scale of [1, 1.5, 2, 2.5, 3]) {
    const paper = await image.boundingBox();
    const table = page.locator('[data-inspection-overlay="0"]');
    const area = await table.boundingBox();
    if (!paper || !area) throw new Error('Missing ledger geometry');
    expect(area.y).toBeGreaterThanOrEqual(paper.y + paper.height * 0.24);
    expect(area.y + area.height).toBeLessThanOrEqual(
      paper.y + paper.height * 0.84,
    );
    expect(area.x).toBeGreaterThanOrEqual(paper.x + paper.width * 0.07);
    expect(area.x + area.width).toBeLessThanOrEqual(
      paper.x + paper.width * 0.49,
    );
    for (const overlay of await page
      .locator('[data-inspection-overlay]')
      .all()) {
      const overflow = await overlay.evaluate((el) => ({
        x: el.scrollWidth - el.clientWidth,
        y: el.scrollHeight - el.clientHeight,
      }));
      expect(overflow.x).toBeLessThanOrEqual(1);
      expect(overflow.y).toBeLessThanOrEqual(1);
    }
    if (scale < 3) await click(page, 'Увеличить');
  }
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-ledger-page.png`,
    fullPage: true,
  });
  for (let i = 0; i < 4; i++) await click(page, 'Уменьшить');
  const writing = page.getByText('Г. Соколов', { exact: true });
  const baseSize = await writing.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  await click(page, 'Увеличить');
  expect(
    await writing.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThan(baseSize);
  expect((await state(page)).state.players[0]?.facts).not.toContain(
    'f-ledger-signature',
  );
  await page
    .getByRole('button', { name: 'Осмотреть участок 1', exact: true })
    .click();
  expect((await state(page)).state.players[0]?.facts).toContain(
    'f-ledger-signature',
  );
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-ledger-signature.png`,
    fullPage: true,
  });
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  await page
    .getByRole('combobox', { name: 'Тон', exact: true })
    .selectOption('pressure');
  await click(page, 'Какие у вас были отношения с Аркадием?');
  await page
    .getByRole('combobox', { name: 'Тон', exact: true })
    .selectOption('neutral');
  await click(page, 'Тайная бухгалтерия');
  expect((await state(page)).state.players[0]?.truths).toContain('t-money');
  await expect(page.locator('.latestReply')).toContainText('Брал в долг');
});

test('валидатор дедукции: каждый из двух фактов необходим', async ({
  request,
}) => {
  const c = caseSchema.parse(
    await (await request.get('/cases/case-001-blue-owl/case.json')).json(),
  );
  expect(validateCase(c).errors).toEqual([]);
  for (const missing of ['f-safe-hint', 'f-opening-date']) {
    const copy = structuredClone(c);
    for (const cl of copy.clues)
      cl.revealsFactIds = cl.revealsFactIds.filter((id) => id !== missing);
    expect(validateCase(copy).reached.includes('c-ledger')).toBe(false);
  }
});

test('кратчайший путь с известным кодом: одна зона, подпись и победа в первом раунде', async ({
  page,
}) => {
  await start(page);
  await safe(page);
  await enterSafeCode(page);
  await click(page, 'Осмотреть предмет 1');
  await page
    .getByRole('button', { name: 'Осмотреть участок 1', exact: true })
    .click();
  const s = await state(page);
  expect(s.state.round).toBe(1);
  expect(s.state.action?.used).toBe(1);
  expect(s.state.players[0]?.facts).not.toContain('f-safe-hint');
  expect(s.state.players[0]?.facts).not.toContain('f-opening-date');
  await exitSafeItem(page);
  await accuse(page);
});

test('самостоятельная дедукция: фотография и ежедневник, три зоны за два хода, победа', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Обыск');
  await click(page, 'Зал бара');
  await click(page, 'Старые фото');
  const text = await page
    .getByRole('region', { name: 'Документ', exact: true })
    .innerText();
  const match = text.match(/(\d{2})\.(\d{2})\.2014/);
  if (!match) throw new Error('date');
  const code = (match[1] ?? '') + (match[2] ?? '');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Письменный стол');
  await expect(
    page.getByRole('region', { name: 'Документ', exact: true }),
  ).toContainText('Сейф — день рождения Совы');
  await expect(
    page.getByRole('region', { name: 'Документ', exact: true }),
  ).not.toContainText('1408');
  await click(page, 'Назад');
  await click(page, 'Сейф');
  await enterSafeCode(page, code);
  await click(page, 'Осмотреть предмет 1');
  await page
    .getByRole('button', { name: 'Осмотреть участок 1', exact: true })
    .click();
  const s = await state(page);
  expect(s.state.round).toBe(2);
  expect(s.state.action?.used).toBe(2);
  await exitSafeItem(page);
  await accuse(page);
});

test('старая партия переносит открытый сейф, известную подпись, заметки и доску без потерь', async ({
  page,
}) => {
  await start(page);
  const old = await state(page);
  old.version = 2;
  const player = old.state.players[0];
  if (!player) throw new Error('Missing player');
  delete (player as Partial<typeof player>).openedLocks;
  player.clues = ['c-ledger', 'c-photo'];
  player.facts = ['f-double-books', 'f-safe-code'];
  player.visited = ['h-safe'];
  player.notes = 'Моя сохранённая заметка';
  old.state.board = [{ id: 'f-safe-code', by: 0 }];
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('keyval-store');
      req.onsuccess = () => resolve(req.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(value, 'interrogation-save-v1');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }, old);
  await page.goto('/');
  await click(page, 'Продолжить');
  await page
    .getByRole('button', { name: /^Детектив 1$/ })
    .dispatchEvent('pointerdown');
  await expect(
    page.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
  await safe(page);
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Содержимое сейфа', exact: true }),
  ).toBeVisible();
  const migrated = await state(page);
  expect(migrated.version).toBe(3);
  expect(migrated.state.players[0]?.facts).toEqual(
    expect.arrayContaining([
      'f-safe-hint',
      'f-opening-date',
      'f-ledger-signature',
    ]),
  );
  expect(migrated.state.players[0]?.notes).toBe(player.notes);
  expect(migrated.state.board[0]?.id).toBe('f-safe-hint');
});

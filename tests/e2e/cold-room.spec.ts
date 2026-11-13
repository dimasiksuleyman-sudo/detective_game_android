import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/engine';
import { grantProof } from './proofHelpers';
import caseData from '../../public/cases/case-003-cold-room/case.json' with { type: 'json' };
async function click(p: Page, name: string) {
  await p.getByRole('button', { name, exact: true }).click();
  // S08/S10 change nested views without changing URL or h2. Wait for React's
  // next paint before resolving another identically named Back button.
  await p.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}
async function saved(p: Page): Promise<GameState> {
  return p.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('keyval-store');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const envelope = await new Promise<{ state: GameState }>(
      (resolve, reject) => {
        const req = db
          .transaction('keyval')
          .objectStore('keyval')
          .get('interrogation-save-v1');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    return envelope.state;
  });
}
async function handover(p: Page, n: number) {
  await expect(
    p.getByRole('heading', { name: /Передайте телефон/ }),
  ).toBeVisible();
  await p
    .getByRole('button', { name: 'Детектив ' + n, exact: true })
    .dispatchEvent('pointerdown');
  await expect(
    p.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
}
async function start(p: Page, count = 1) {
  await p.goto('/');
  await click(p, 'Новое дело');
  await click(p, 'Холодная камера');
  await p.getByLabel('Количество игроков').selectOption(String(count));
  await click(p, 'К брифингу');
  await expect(p.locator('main')).toContainText('Павла Ремеза');
  await click(p, 'Начать расследование');
  if (count > 1) await handover(p, 1);
}
async function hub(p: Page) {
  const title = p.locator('main h2');
  for (let i = 0; i < 4; i++) {
    await expect(title).toBeVisible();
    if ((await title.innerText()) === 'Хаб хода') break;
    await click(p, 'Назад');
  }
  await expect(title).toHaveText('Хаб хода');
}
async function nextTurn(p: Page) {
  await hub(p);
  await click(p, 'Завершить ход');
  await expect(
    p.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
}
async function room(p: Page, name: string) {
  await click(p, 'Обыск');
  await click(p, name);
}
async function examine(p: Page, hotspot: string) {
  await p
    .getByRole('button', { name: new RegExp('^' + hotspot + '(?: ✓)?$') })
    .click();
}
async function detail(p: Page, factId: string) {
  const before = await saved(p);
  expect(before.players[before.current]?.facts).not.toContain(factId);
  await p
    .getByRole('button', { name: 'Осмотреть участок 1', exact: true })
    .click();
  await expect
    .poll(async () => {
      const s = await saved(p);
      return s.players[s.current]?.facts.includes(factId);
    })
    .toBe(true);
  const after = await saved(p);
  expect(after.action?.used).toBe(before.action?.used);
}
async function openSafe(p: Page, code: string) {
  for (let i = 0; i < code.length; i++) {
    const wheel = p.getByRole('spinbutton', {
      name: 'Колёсико ' + (i + 1),
      exact: true,
    });
    await wheel.focus();
    await wheel.press('Home');
    for (let n = 0; n < Number(code[i]); n++) await wheel.press('ArrowUp');
  }
  await click(p, 'Открыть сейф');
}

async function talk(p: Page) {
  await click(p, 'Допрос');
  await click(p, 'Маргарита Сергеевна Ветлугина');
}
async function accuse(p: Page, culprit: string, evidence: string[]) {
  await click(p, 'Обвинить');
  await p
    .getByRole('combobox', { name: 'Виновный', exact: true })
    .selectOption(culprit);
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-cover-fraud');
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-locked-cold');
  await click(p, 'Далее');
  for (const id of evidence) {
    const label =
      caseData.facts.find((f) => f.id === id)?.text ??
      caseData.clues.find((c) => c.id === id)?.name;
    if (!label) throw new Error('Missing evidence ' + id);
    await p.getByRole('checkbox', { name: label, exact: true }).check();
  }
  await click(p, 'Предъявить обвинение');
}
test.describe('Холодная камера', () => {
  test.setTimeout(90000);
  test('сейф: неверный код, 0418 и три независимых предмета', async ({
    page,
  }, info) => {
    await start(page);
    await room(page, 'Цех и весовая');
    await examine(page, 'Стол учётчика и сейф');
    await expect(page.getByRole('spinbutton')).toHaveCount(4);
    await openSafe(page, '0000');
    await expect(page.getByText('Не подходит.', { exact: true })).toBeVisible();
    expect((await saved(page)).action).toBeNull();
    await openSafe(page, '0418');
    expect((await saved(page)).players[0]?.clues).toEqual([]);
    for (let i = 1; i <= 3; i++) {
      await click(page, 'Осмотреть предмет ' + i);
      await expect(page.getByLabel('Документ', { exact: true })).toBeVisible();
      await click(page, 'К содержимому сейфа');
    }
    const state = await saved(page);
    expect(state.action?.used).toBe(1);
    expect(state.players[0]?.clues).toEqual([
      'c-check-book',
      'c-complaint',
      'c-artyom-iou',
    ]);
    await page.screenshot({
      path: `test-results/screens/cold-room/${info.project.name}-safe.png`,
      fullPage: true,
    });
    await page.reload();
    await handover(page, 1);
    await room(page, 'Цех и весовая');
    await examine(page, 'Стол учётчика и сейф');
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
  });
  test('три детали: до осмотра факта нет, находка бесплатна и сохраняется', async ({
    page,
  }, info) => {
    await start(page);
    await room(page, 'Цех и весовая');
    await examine(page, 'Термограф');
    await detail(page, 'f-door-openings');
    await page.screenshot({
      path: `test-results/screens/cold-room/${info.project.name}-thermograph.png`,
      fullPage: true,
    });
    await click(page, 'Назад');
    await examine(page, 'Дверь морозильной камеры');
    await detail(page, 'f-seal-07');
    await page.screenshot({
      path: `test-results/screens/cold-room/${info.project.name}-seal.png`,
      fullPage: true,
    });
    await hub(page);
    await nextTurn(page);
    await room(page, 'Морозильная камера № 2');
    await examine(page, 'Иней у входа');
    await detail(page, 'f-two-tracks');
    await page.screenshot({
      path: `test-results/screens/cold-room/${info.project.name}-frost.png`,
      fullPage: true,
    });
    expect((await saved(page)).players[0]?.inspectedDetails).toEqual([
      'd-door-spikes',
      'd-seal-number',
      'd-frost-tracks',
    ]);
    await page.reload();
    await handover(page, 1);
    expect((await saved(page)).players[0]?.facts).toEqual(
      expect.arrayContaining(['f-door-openings', 'f-seal-07', 'f-two-tracks']),
    );
  });
  test('три ступени Маргариты и afterBreak соответствующей темы', async ({
    page,
  }) => {
    await start(page);
    // Экранный тест получает находки через сохранение; реальный путь их сбора и
    // ступени без подстановки стресса проверяет coldRoom.test.ts.
    await grantProof(page, {
      clues: ['c-check-book', 'c-gate-log', 'c-seal'],
      facts: ['f-certificate', 'f-door-openings', 'f-seal-07', 'f-seal-intact'],
    });
    await talk(page);
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('pressure');
    await click(page, 'Вы опломбировали камеру?');
    await click(page, 'Чей пломбир № 07?');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('neutral');
    await click(page, 'Тетрадь сверок');
    expect((await saved(page)).players[0]?.truths).toContain('t-signed');
    await hub(page);
    await nextTurn(page);
    await talk(page);
    await click(page, 'Журнал проходной');
    expect((await saved(page)).players[0]?.truths).toContain('t-night');
    await click(page, 'Когда вы были на заводе?');
    await expect(page.locator('.latestReply')).toContainText(
      'И ночью, в два. Вы уже знаете.',
    );
    await click(page, 'Срезанная пломба');
    expect((await saved(page)).players[0]?.facts).toContain(
      'f-margarita-confession',
    );
  });
  test('двое: первый принят, второй выбыл; итоги и три кадра', async ({
    page,
  }, info) => {
    await start(page, 2);
    await room(page, 'Двор и проходная');
    await examine(page, 'Кабина рефрижератора');
    await hub(page);
    await accuse(page, 's-margarita', ['c-certificate']);
    await expect(page.getByRole('alertdialog')).toContainText(
      'Прокурор принял дело',
    );
    await click(page, 'Понятно');
    await handover(page, 2);
    await accuse(page, 's-artyom', []);
    await expect(page.locator('main')).toContainText(
      'обвинение не подтвердилось',
    );
    await expect(
      page.getByRole('heading', { name: 'Итоги', exact: true }),
    ).toBeVisible();
    const state = await saved(page);
    expect(state.winners).toEqual([0]);
    expect(state.players[0]?.score).toBe(22);
    expect(state.players[1]?.score).toBe(0);
    expect(state.players[1]?.eliminated).toBe(true);
    await click(page, 'Как всё было');
    await expect(page.locator('main')).toContainText(
      caseData.solution.explanation,
    );
    for (const frame of caseData.solution.reconstruction) {
      await expect(
        page.getByText(frame.caption, { exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator('img[src*="/reconstruction/"]')).toHaveCount(3);
    await page.screenshot({
      path: `test-results/screens/cold-room/${info.project.name}-reconstruction.png`,
      fullPage: true,
    });
    await click(page, 'К итогам');
    await expect(
      page.getByRole('heading', { name: 'Итоги', exact: true }),
    ).toBeVisible();
  });
  test('нераскрытое дело скрывает решение до явного согласия', async ({
    page,
  }) => {
    await start(page);
    await accuse(page, 's-semyon', []);
    await expect(
      page.getByRole('heading', { name: 'Дело не раскрыто', exact: true }),
    ).toBeVisible();
    await expect(page.locator('main')).not.toContainText(
      caseData.solution.explanation,
    );
    await expect(page.locator('img[src*="/reconstruction/"]')).toHaveCount(0);
    await click(page, 'Да, показать разгадку');
    await expect(page.locator('main')).toContainText(
      caseData.solution.explanation,
    );
    await expect(page.locator('img[src*="/reconstruction/"]')).toHaveCount(3);
  });
});

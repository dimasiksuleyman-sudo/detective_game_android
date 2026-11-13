import { test, expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/engine';
import caseData from '../../public/cases/case-002-room-seven/case.json' with { type: 'json' };
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
  await click(p, 'Номер семь');
  await p.getByLabel('Количество игроков').selectOption(String(count));
  await click(p, 'К брифингу');
  await expect(p.locator('main')).toContainText('Бориса Каретникова');
  await expect(p.getByRole('button', { name: /Прослушать/ })).toHaveCount(0);
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
async function openBriefcase(p: Page, code: string) {
  for (let i = 0; i < code.length; i++) {
    const wheel = p.getByRole('spinbutton', {
      name: 'Колёсико ' + (i + 1),
      exact: true,
    });
    await wheel.focus();
    await wheel.press('Home');
    for (let n = 0; n < Number(code[i]); n++) await wheel.press('ArrowUp');
  }
  await click(p, 'Открыть портфель');
}
async function takeReceipt(p: Page) {
  await room(p, 'Номер 7');
  await examine(p, 'Портфель');
  await openBriefcase(p, '214');
  await click(p, 'Осмотреть предмет 1');
  await expect(
    p.getByRole('heading', { name: 'Расписка 1998 года', exact: true }),
  ).toBeVisible();
  await click(p, 'К содержимому портфеля');
  await click(p, 'Назад');
  await click(p, 'Назад');
  await nextTurn(p);
}
async function talk(p: Page, name: string) {
  await click(p, 'Допрос');
  await click(p, name);
}
async function accuse(
  p: Page,
  culprit = 's-nadia',
  evidence = 'f-wet-footprints',
) {
  await click(p, 'Обвинить');
  await p
    .getByRole('combobox', { name: 'Виновный', exact: true })
    .selectOption(culprit);
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-heirloom');
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-sedative');
  await click(p, 'Далее');
  if (evidence) {
    const text = caseData.facts.find((f) => f.id === evidence)?.text;
    if (!text) throw new Error('Missing evidence');
    await p.getByRole('checkbox', { name: text, exact: true }).check();
  }
  await click(p, 'Предъявить обвинение');
}
test.describe('Номер семь', () => {
  test.setTimeout(90000);
  test('кратчайшая победа: балконная дверь и обвинение в первом раунде', async ({
    page,
  }, info) => {
    await start(page);
    await room(page, 'Номер 7');
    await examine(page, 'Балконная дверь');
    expect((await saved(page)).action?.used).toBe(1);
    await click(page, 'Назад');
    await click(page, 'Назад');
    await hub(page);
    await accuse(page);
    await expect(
      page.getByRole('heading', { name: 'Как всё было', exact: true }),
    ).toBeVisible();
    const state = await saved(page);
    expect(state.winners).toEqual([0]);
    expect(state.round).toBe(1);
    await expect(page.locator('main')).toContainText(
      'Она не знала, что Каретников принимает сердечные таблетки',
    );
    await page.screenshot({
      path: `test-results/screens/room-seven/${info.project.name}-ending.png`,
      fullPage: true,
    });
  });
  test('портфель: неверный и верный код, три предмета, продолжение своего дела', async ({
    page,
  }, info) => {
    await start(page);
    await room(page, 'Номер 7');
    await examine(page, 'Портфель');
    await expect(page.getByRole('spinbutton')).toHaveCount(3);
    await openBriefcase(page, '000');
    await expect(page.getByText('Не подходит.', { exact: true })).toBeVisible();
    expect((await saved(page)).action).toBeNull();
    await openBriefcase(page, '214');
    let state = await saved(page);
    expect(state.action?.used).toBe(1);
    expect(state.players[0]?.clues).toEqual([]);
    await page.screenshot({
      path: `test-results/screens/room-seven/${info.project.name}-briefcase.png`,
      fullPage: true,
    });
    for (let i = 1; i <= 3; i++) {
      await click(page, 'Осмотреть предмет ' + i);
      await expect(page.getByLabel('Документ', { exact: true })).toBeVisible();
      await click(page, 'К содержимому портфеля');
    }
    state = await saved(page);
    expect(state.players[0]?.clues).toEqual([
      'c-receipt',
      'c-mortgage',
      'c-buyer-note',
    ]);
    expect(state.action?.used).toBe(1);
    await page.goto('/');
    await click(page, 'Продолжить');
    await handover(page, 1);
    expect((await saved(page)).caseId).toBe('case-002-room-seven');
    await room(page, 'Номер 7');
    await examine(page, 'Портфель');
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
  });
  test('самостоятельная дедукция: блокнот И визитка, затем портфель', async ({
    page,
  }) => {
    await start(page);
    await room(page, 'Номер 7');
    await examine(page, 'Письменный стол');
    await click(page, 'Назад');
    await examine(page, 'Пиджак на стуле');
    let s = await saved(page);
    expect(s.players[0]?.facts).toEqual(
      expect.arrayContaining(['f-portfel-hint', 'f-first-shop']),
    );
    expect(s.action?.used).toBe(2);
    await click(page, 'Назад');
    await click(page, 'Назад');
    await nextTurn(page);
    await room(page, 'Номер 7');
    await examine(page, 'Портфель');
    await openBriefcase(page, '214');
    await click(page, 'Осмотреть предмет 1');
    s = await saved(page);
    expect(s.players[0]?.facts).toContain('f-pledge-receipt');
    expect(s.round).toBe(2);
  });
  test('все три детали открываются только самостоятельным осмотром', async ({
    page,
  }, info) => {
    await start(page);
    await room(page, 'Номер 7');
    await examine(page, 'Поднос с чаем');
    await detail(page, 'f-tea-drugged');
    await page.screenshot({
      path: `test-results/screens/room-seven/${info.project.name}-saucer.png`,
      fullPage: true,
    });
    await click(page, 'Назад');
    await click(page, 'Назад');
    await nextTurn(page);
    await room(page, 'Коридор и общий балкон');
    await examine(page, 'Перегородка');
    await detail(page, 'f-grey-thread');
    await click(page, 'Назад');
    await examine(page, 'Бельевая тележка');
    await detail(page, 'f-engraving');
    const s = await saved(page);
    expect(s.players[0]?.inspectedDetails).toEqual([
      'd-saucer-residue',
      'd-thread',
      'd-engraving',
    ]);
    expect(s.action?.used).toBe(2);
    await page.reload();
    await handover(page, 1);
    await click(page, 'Блокнот');
    await click(page, 'Факты');
    await expect(page.locator('main')).toContainText('белый горький налёт');
    await expect(page.locator('main')).toContainText('серая шерстяная нитка');
    await expect(page.locator('main')).toContainText('за тридцать лет у маяка');
  });
  test('Руслан раскрывает свидетельство, только затем ночной слом Надежды и afterBreak', async ({
    page,
  }) => {
    await start(page);
    await room(page, 'Коридор и общий балкон');
    await examine(page, 'Перегородка');
    await detail(page, 'f-grey-thread');
    await click(page, 'Назад');
    await click(page, 'Назад');
    await nextTurn(page);
    await room(page, 'Холл и ресепшен');
    await examine(page, 'Куртка портье');
    await click(page, 'Назад');
    await click(page, 'Назад');
    await nextTurn(page);
    await talk(page, 'Надежда Сорокина');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('pressure');
    await click(page, 'Перегородка балкона');
    expect((await saved(page)).players[0]?.truths).not.toContain('t-night');
    await click(page, 'У вас с собой лекарства?');
    await click(page, 'Что вы видели за ужином?');
    await click(page, 'Назад');
    await nextTurn(page);
    await talk(page, 'Руслан Гаев');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('pressure');
    await click(page, 'Мокрая куртка портье');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('neutral');
    await click(page, 'Мокрая куртка портье');
    expect((await saved(page)).players[0]?.facts).toContain(
      'f-figure-on-balcony',
    );
    await click(page, 'Где вы были ночью?');
    await expect(page.locator('.latestReply')).toContainText(
      'Грузил фургон. И видел женщину на балконе.',
    );
    await click(page, 'Назад');
    await nextTurn(page);
    await talk(page, 'Надежда Сорокина');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('pressure');
    await click(page, 'Перегородка балкона');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('neutral');
    await click(page, 'Перегородка балкона');
    let s = await saved(page);
    expect(s.players[0]?.facts).toContain('f-nadia-confession');
    expect(s.players[0]?.truths).not.toContain('t-knew');
    await click(page, 'Где вы были ночью?');
    await expect(page.locator('.latestReply')).toContainText(
      'На балконе. Вы уже знаете зачем.',
    );
    s = await saved(page);
    expect(s.players[0]?.truths).toContain('t-night');
  });
  test('расписка и гравировка раскрывают только знакомство: afterBreak первой темы', async ({
    page,
  }) => {
    await start(page);
    await takeReceipt(page);
    await room(page, 'Коридор и общий балкон');
    await examine(page, 'Бельевая тележка');
    await detail(page, 'f-engraving');
    await click(page, 'Назад');
    await click(page, 'Назад');
    await nextTurn(page);
    await talk(page, 'Надежда Сорокина');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('pressure');
    await click(page, 'Расписка 1998 года');
    await click(page, 'Расписка 1998 года');
    await page
      .getByRole('combobox', { name: 'Тон', exact: true })
      .selectOption('neutral');
    await click(page, 'Расписка 1998 года');
    await click(page, 'Назад');
    await nextTurn(page);
    await talk(page, 'Надежда Сорокина');
    await click(page, 'Вы знали Каретникова?');
    await expect(page.locator('.latestReply')).toContainText(
      'Знала, кто он. Он разорил моего отца.',
    );
    await click(page, 'Где вы были ночью?');
    await expect(page.locator('.latestReply')).toContainText(
      'В номере. Читала, потом уснула. Шторм мешал, но я не выходила.',
    );
    expect((await saved(page)).players[0]?.truths).not.toContain('t-night');
  });
  test('двое игроков: ошибочное обвинение, второй раскрывает дело', async ({
    page,
  }) => {
    await start(page, 2);
    await accuse(page, 's-dmitry', '');
    await handover(page, 2);
    expect((await saved(page)).players[0]?.eliminated).toBe(true);
    await room(page, 'Номер 7');
    await examine(page, 'Балконная дверь');
    await click(page, 'Назад');
    await click(page, 'Назад');
    await hub(page);
    await accuse(page);
    await expect.poll(async () => (await saved(page)).winners).toEqual([1]);
  });
});

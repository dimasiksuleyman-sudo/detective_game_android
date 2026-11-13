import { test, expect, type Page } from '@playwright/test';
const click = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true }).click();
async function start(p: Page, count = 1) {
  await p.goto('/');
  await click(p, 'Новое дело');
  await click(p, 'Синяя сова');
  await p.getByLabel('Количество игроков').selectOption(String(count));
  await click(p, 'К брифингу');
  await click(p, 'Начать расследование');
}
async function toHub(p: Page) {
  for (let i = 0; i < 3; i++) await click(p, 'Назад');
  await expect(
    p.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
}
const channel = (p: Page, c: string) =>
  p.locator(`audio[data-audio-channel="${c}"]`);
async function allPaused(p: Page, c: string) {
  await expect
    .poll(() =>
      channel(p, c).evaluateAll((xs) =>
        xs.every((a) => (a as HTMLAudioElement).paused),
      ),
    )
    .toBe(true);
}

test('чат без внутренней прокрутки, история отдельно, после признания Ольга не повторяет ложь', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Диван');
  await toHub(page);
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Ольга Лебедева');
  await click(page, 'Билет на поезд');
  const music = page.locator(
    'audio[data-audio-channel="music"][data-current="true"]',
  );
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.volume))
    .toBeCloseTo(0.1, 2);
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.volume), {
      timeout: 10000,
    })
    .toBeCloseTo(0.4, 2);
  await click(page, 'Где вы были вечером?');
  const latest = page.locator('.latestReply blockquote');
  await expect(latest).toContainText('Я приехала в Ветрогорск в 22:10');
  await expect(latest).not.toContainText('Дома, в Северске');
  expect(
    await latest.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  expect(
    await page
      .getByRole('log')
      .evaluate((el) => getComputedStyle(el).overflowY),
  ).toBe('visible');
  const chat = await page.getByRole('log').boundingBox();
  const toggle = page.getByRole('button', { name: 'Офлайн', exact: true });
  const box = await toggle.boundingBox();
  expect(box?.y).toBeGreaterThan((chat?.y ?? 0) + (chat?.height ?? 0));
  await page.getByText('Предыдущие реплики', { exact: true }).click();
  await expect(page.locator('.chat blockquote')).toHaveCount(2);
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-full-reply.png`,
    fullPage: true,
  });
});

test('все одиннадцать документов содержат исходные реквизиты и записи, а не тексты фактов', async ({
  page,
  request,
}) => {
  const c = await (
    await request.get('/cases/case-001-blue-owl/case.json')
  ).json();
  const documents = c.clues.filter((x: { document?: unknown }) => x.document);
  expect(documents).toHaveLength(11);
  const facts = new Set(c.facts.map((f: { text: string }) => f.text));
  for (const d of documents)
    for (const v of Object.values(d.document.fields))
      for (const line of Array.isArray(v) ? v : [v])
        expect(facts.has(line)).toBe(false);
  expect(
    documents.find((d: { id: string }) => d.id === 'c-ledger').document.fields
      .entries,
  ).toHaveLength(5);
  await start(page);
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Письменный стол');
  const doc = page.getByRole('region', { name: 'Документ', exact: true });
  await expect(doc).toContainText('Сейф — день рождения Совы');
  await expect(doc).not.toContainText('В ежедневнике записан код');
});

test('музыка запускается только с жеста, выключается сразу, настройки сохраняются; дождь независим', async ({
  page,
}) => {
  await page.goto('/');
  await allPaused(page, 'music');
  await click(page, 'Настройки');
  await expect
    .poll(() =>
      channel(page, 'music').evaluateAll((xs) =>
        xs.some((a) => !(a as HTMLAudioElement).paused),
      ),
    )
    .toBe(true);
  await page.getByLabel('Музыка', { exact: true }).uncheck();
  await allPaused(page, 'music');
  await page.getByLabel('Звуки', { exact: true }).uncheck();
  await allPaused(page, 'effect');
  await page.getByLabel('Дождь', { exact: true }).check();
  await expect(channel(page, 'rain')).toHaveJSProperty('paused', false);
  await page.getByLabel('Дождь', { exact: true }).uncheck();
  await allPaused(page, 'rain');
  await page.reload();
  await expect(page.getByLabel('Музыка', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Звуки', { exact: true })).not.toBeChecked();
  await click(page, 'Назад');
  await allPaused(page, 'music');
  await allPaused(page, 'effect');
});

test('фоновая музыка приглушается под голос, ставится на паузу в фоне и продолжается с позиции', async ({
  page,
}) => {
  await page.goto('/');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await click(page, 'К брифингу');
  const music = page.locator(
    'audio[data-audio-channel="music"][data-current="true"]',
  );
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.volume))
    .toBeCloseTo(0.4, 2);
  const voice = page.locator('section[aria-label="Озвучка"] audio');
  await voice.evaluate((a: HTMLAudioElement) => a.play());
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.volume))
    .toBeCloseTo(0.1, 2);
  await voice.evaluate((a: HTMLAudioElement) => a.pause());
  await expect
    .poll(() => music.evaluate((a: HTMLAudioElement) => a.volume))
    .toBeCloseTo(0.4, 2);
  const time = await music.evaluate((a: HTMLAudioElement) => a.currentTime);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await allPaused(page, 'music');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(music).toHaveJSProperty('paused', false);
  expect(
    await music.evaluate((a: HTMLAudioElement) => a.currentTime),
  ).toBeGreaterThanOrEqual(time);
});

test('удержание: звук начинается вместе с полоской, отмена останавливает, успешное удержание оставляет подтверждение', async ({
  page,
}) => {
  await start(page, 2);
  await expect(
    page.locator('audio[data-sound-id="handover"]'),
  ).toHaveJSProperty('paused', false);
  const button = page.getByRole('button', { name: 'Детектив 1', exact: true });
  const cue = page.locator('audio[data-sound-id="hold-confirm"]');
  await button.dispatchEvent('pointerdown');
  await expect(cue).toHaveJSProperty('paused', false);
  await button.dispatchEvent('pointercancel');
  await expect(cue).toHaveJSProperty('paused', true);
  await expect(cue).toHaveJSProperty('currentTime', 0);
  await button.dispatchEvent('pointerdown');
  await expect(page.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
  await expect(cue).toHaveJSProperty('paused', false);
  await expect
    .poll(() => cue.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThanOrEqual(1);
});

test('семантические эффекты: ui-tap, paper, new-fact и ошибка обвинения', async ({
  page,
}) => {
  await start(page);
  await expect(page.locator('audio[data-sound-id="ui-tap"]')).toHaveAttribute(
    'src',
    '/audio/sfx/ui-tap.mp3',
  );
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Письменный стол');
  await expect(page.locator('audio[data-sound-id="paper"]')).toHaveAttribute(
    'src',
    '/audio/sfx/paper.mp3',
  );
  await expect(page.locator('audio[data-sound-id="new-fact"]')).toHaveAttribute(
    'src',
    '/audio/sfx/new-fact.mp3',
  );
  await toHub(page);
  await click(page, 'Обвинить');
  await page
    .getByRole('combobox', { name: 'Виновный', exact: true })
    .selectOption('s-vera');
  await click(page, 'Далее');
  await page
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-embezzlement');
  await click(page, 'Далее');
  await page
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-statuette');
  await click(page, 'Далее');
  await page.getByLabel('Ежедневник Аркадия', { exact: true }).check();
  await click(page, 'Предъявить обвинение');
  await expect(page.locator('audio[data-sound-id="error"]')).toHaveAttribute(
    'src',
    '/audio/sfx/error.mp3',
  );
});

test('сворачивание отменяет таймер удержания вместе со звуком и не открывает личный экран', async ({
  page,
}) => {
  // Часы ставим до загрузки страницы (так советует Playwright): установка
  // посреди сессии давала гонку в CI — dispatchEvent висел 30 с.
  await page.clock.install();
  await start(page, 2);
  const button = page.getByRole('button', { name: 'Детектив 1', exact: true });
  await expect(button).toBeVisible();
  await button.dispatchEvent('pointerdown');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(1500);
  await expect(
    page.getByRole('heading', {
      name: 'Передайте телефон: Детектив 1',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator('audio[data-sound-id="hold-confirm"]'),
  ).toHaveJSProperty('paused', true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(
    page.getByRole('heading', {
      name: 'Передайте телефон: Детектив 1',
      exact: true,
    }),
  ).toBeVisible();
});

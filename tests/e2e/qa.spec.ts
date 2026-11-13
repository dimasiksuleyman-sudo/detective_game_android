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
async function hub(p: Page) {
  await expect(p.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
}
async function diary(p: Page) {
  await click(p, 'Обыск');
  await click(p, 'Кабинет');
  await click(p, 'Письменный стол');
}
const systemBack = (p: Page) =>
  p.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));

test('1: системная и реальная история назад сохраняют улику, запрещают S03/S04/S05', async ({
  page,
}) => {
  await start(page);
  await diary(page);
  await page.goBack();
  await hub(page);
  for (const s of ['s03', 's04', 's05']) {
    await page.evaluate((s) => {
      location.hash = '/' + s;
    }, s);
    await hub(page);
    await page.waitForURL('**/#/s07');
  }
  await click(page, 'Блокнот');
  await expect(
    page.getByRole('button', { name: 'Ежедневник Аркадия', exact: true }),
  ).toBeVisible();
  await systemBack(page);
  await hub(page);
  page.once('dialog', (d) => d.dismiss());
  await systemBack(page);
  await hub(page);
  page.once('dialog', (d) => d.accept());
  await systemBack(page);
  await expect(
    page.getByRole('heading', { name: 'Главное меню' }),
  ).toBeVisible();
  page.once('dialog', (d) => d.dismiss());
  await click(page, 'Новое дело');
  await expect(
    page.getByRole('heading', { name: 'Главное меню' }),
  ).toBeVisible();
  await click(page, 'Продолжить');
  await expect(
    page.getByRole('heading', { name: /Передайте телефон/ }),
  ).toBeVisible();
});

test('3: явные Назад S03/S04/S15/S16; режим ИИ без ключа недоступен', async ({
  page,
}) => {
  await page.goto('/');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await expect(
    page.getByRole('button', { name: 'ИИ · свободные вопросы', exact: true }),
  ).toBeDisabled();
  await click(page, 'Назад');
  await expect(
    page.getByRole('heading', { name: 'Выбрать дело' }),
  ).toBeVisible();
  await click(page, 'Назад');
  for (const name of ['Настройки', 'Как играть']) {
    await click(page, name);
    await click(page, 'Назад');
    await expect(
      page.getByRole('heading', { name: 'Главное меню' }),
    ).toBeVisible();
  }
});

test('4,6,7: Назад комнаты и документа, описание один раз, шаблон дневника', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await page.getByRole('button', { name: /^Сейф/ }).click();
  await expect(page.getByRole('spinbutton')).toHaveCount(4);
  await click(page, 'Назад');
  await click(page, 'Назад');
  await expect(page.getByRole('status')).toHaveCount(0);
  await click(page, 'Кабинет');
  await click(page, 'Письменный стол');
  await expect(page.locator('[data-template="diary"]')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await click(page, 'Назад');
  await expect(
    page.getByRole('heading', { name: 'Кабинет', exact: true }),
  ).toBeVisible();
  await click(page, 'Назад');
  await expect(
    page.getByRole('button', { name: 'Зал бара', exact: true }),
  ).toBeVisible();
  await click(page, 'Назад');
  await hub(page);
});

test('4,9,11: компактный допрос, имя одно, офлайн доступен, Назад к подозреваемым', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Допрос');
  await click(page, 'Вера Орлова');
  await expect(page.getByText('Вера Орлова', { exact: true })).toHaveCount(1);
  const image = page.locator('figure img');
  const b = await image.boundingBox();
  expect(b?.height).toBeLessThanOrEqual(
    (page.viewportSize()?.height ?? 800) * 0.4,
  );
  await expect(
    page.getByText('Пока нечего предъявить. Найдите улики при обыске.'),
  ).toBeVisible();
  await click(page, 'Из-за чего вы ругались?');
  await expect(page.getByRole('blockquote')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveCount(0);
  await click(page, 'Назад');
  await expect(
    page.getByRole('button', { name: 'Глеб Соколов', exact: true }),
  ).toBeVisible();
});

test('8,9: заметки автоматически сохраняются при вкладке, выходе и перезагрузке; пустая доска', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Общая доска');
  await expect(page.getByText(/Пока нет общих находок/)).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await click(page, 'Заметки');
  await page.getByRole('textbox', { name: 'Заметки' }).fill('Проверить ключи');
  await click(page, 'Факты');
  await click(page, 'Заметки');
  await expect(page.getByRole('textbox', { name: 'Заметки' })).toHaveValue(
    'Проверить ключи',
  );
  await page
    .getByRole('textbox', { name: 'Заметки' })
    .fill('Сохранено без кнопки');
  await click(page, 'Назад');
  await page.reload();
  const hold = page.getByRole('button', { name: 'Детектив 1', exact: true });
  await hold.dispatchEvent('pointerdown');
  await hub(page);
  await click(page, 'Блокнот');
  await click(page, 'Заметки');
  await expect(page.getByRole('textbox', { name: 'Заметки' })).toHaveValue(
    'Сохранено без кнопки',
  );
});

test('10: ноль действий требует подтверждения завершения хода', async ({
  page,
}) => {
  await start(page);
  page.once('dialog', (d) => d.dismiss());
  await click(page, 'Завершить ход');
  await hub(page);
  await expect(page.locator('header')).toContainText('Раунд 1/8');
  page.once('dialog', (d) => d.accept());
  await click(page, 'Завершить ход');
  await hub(page);
  await expect(page.locator('header')).toContainText('Раунд 2/8');
});

test('5,12: передача скрывает данные, меню доступно, удержание без contextmenu с прогрессом', async ({
  page,
}) => {
  await start(page, 2);
  const b = page.getByRole('button', { name: 'Детектив 1', exact: true });
  await expect(
    page.getByRole('button', { name: 'В меню', exact: true }),
  ).toBeVisible();
  await expect(page.locator('header')).not.toContainText('Раунд');
  expect(await b.evaluate((el) => getComputedStyle(el).userSelect)).toBe(
    'none',
  );
  expect(
    await b.evaluate(
      (el) =>
        !el.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        ),
    ),
  ).toBe(true);
  await b.dispatchEvent('pointerdown');
  await expect(b.locator('.holdProgress')).toHaveCSS(
    'animation-name',
    'hold-fill',
  );
  await b.dispatchEvent('pointercancel');
  await expect(
    page.getByRole('heading', { name: /Передайте телефон/ }),
  ).toBeVisible();
  await b.dispatchEvent('pointerdown');
  await hub(page);
});

test('S17 debug: координаты ограничены изображением, JSON и копирование', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await click(page, 'Настройки');
  await click(page, 'Редактор хотспотов');
  const im = page.locator('.editorImage');
  await im.click({ position: { x: 50, y: 50 } });
  const data = JSON.parse(await page.getByTestId('hotspot-json').innerText());
  expect(data.rect.x).toBeGreaterThan(0);
  expect(data.rect.x + data.rect.w).toBeLessThanOrEqual(1);
  await page.getByLabel('Ширина', { exact: true }).fill('0.9');
  await click(page, 'Скопировать JSON');
  await expect(page.getByText('JSON скопирован')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '"rect"',
  );
});

test('2: поставляемый JSON без сломанной пунктуации, ответы канонические', async ({
  request,
}) => {
  const res = await request.get('/cases/case-001-blue-owl/case.json');
  const c = await res.json();
  const text = JSON.stringify(c);
  expect(text).not.toMatch(/; [А-ЯЁA-Z]|\?\.(?!\.)/u);
  expect(c.suspects[0].offlineQA[0].answer).toBe(
    'Уехал домой ровно в одиннадцать. Спал. Объективно, мне нечего добавить',
  );
  const audio = await (
    await request.get('/cases/case-001-blue-owl/audio/manifest.json')
  ).json();
  expect(
    audio.clips.find((x: { id: string }) => x.id === 'solution-explanation')
      .text,
  ).toBe(c.solution.explanation);
});

test('11,13: Онлайн/Офлайн без новой партии, поле вопроса видно, история и квота сохраняются', async ({
  page,
}) => {
  await page.goto('/');
  await click(page, 'Настройки');
  await page
    .getByLabel('Ключ aitunnel', { exact: true })
    .fill('e2e-dummy-credential');
  await click(page, 'Проверить и сохранить ключ');
  await expect(page.getByText('Ключ проверен и сохранён')).toBeVisible();
  await click(page, 'В меню');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await click(page, 'К брифингу');
  await click(page, 'Начать расследование');
  await click(page, 'Допрос');
  await click(page, 'Вера Орлова');
  await click(page, 'Из-за чего вы ругались?');
  await click(page, 'Онлайн');
  const input = page.getByRole('textbox', { name: 'Свободный вопрос' });
  await expect(input).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Спросить ИИ', exact: true }),
  ).toBeVisible();
  await input.fill('Где вы были?');
  await click(page, 'Спросить ИИ');
  await expect(page.locator('.chat blockquote')).toHaveCount(2);
  await click(page, 'Офлайн');
  await expect(input).toBeHidden();
  await expect(page.locator('.chat blockquote')).toHaveCount(2);
  await click(page, 'Онлайн');
  await expect(input).toBeVisible();
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-qa-interrogation.png`,
    fullPage: true,
  });
});

test('1: повторный browser Back из S08/S10/S11/S12/S13 ведёт в хаб без роста истории', async ({
  page,
}) => {
  await start(page);
  const length = await page.evaluate(() => history.length);
  for (const name of [
    'Обыск',
    'Допрос',
    'Блокнот',
    'Общая доска',
    'Обвинить',
  ]) {
    await click(page, name);
    await page.goBack();
    await hub(page);
    expect(await page.evaluate(() => history.length)).toBe(length);
    await expect(page.locator('header')).toContainText('Раунд 1/8');
  }
});

import { test, expect, type Page } from '@playwright/test';
async function capture(p: Page, name: string) {
  const titles: Record<string, string> = {
    'S02-menu': 'Главное меню',
    'S03-case': 'Выбрать дело',
    'S04-players': 'Настройка игроков',
    'S05-briefing': 'Брифинг',
    'S08-locations': 'Обыск',
    'S08-office': 'Кабинет',
    'S09-clue': 'Тайная бухгалтерия',
    'S13-accusation': 'Обвинить',
  };
  if (titles[name])
    await expect(
      p.getByRole('heading', { name: titles[name], exact: true }),
    ).toBeVisible();
  await p.screenshot({
    path: `docs/devlog/assets/m2-fixes/classic/${test.info().project.name}-${name}.png`,
    fullPage: true,
  });
}
async function click(p: Page, name: string) {
  const b = p.getByRole('button', { name, exact: true });
  await expect(b).toBeEnabled();
  await b.click();
}
async function handover(p: Page) {
  await expect(
    p.getByRole('heading', { name: /^(Хаб хода|Передайте телефон:)/ }),
  ).toBeVisible();
  if (await p.getByText('Удерживайте 1 секунду').isVisible()) {
    const b = p.getByRole('button', { name: /Детектив \d/, exact: true });
    await capture(p, 'S06-handover');
    await b.dispatchEvent('pointerdown');
    await expect(p.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
  }
}
async function start(p: Page, count = 1) {
  await p.goto('/');
  await capture(p, 'S02-menu');
  await click(p, 'Новое дело');
  await capture(p, 'S03-case');
  await click(p, 'Синяя сова');
  await p.getByLabel('Количество игроков').selectOption(String(count));
  await capture(p, 'S04-players');
  await click(p, 'К брифингу');
  await capture(p, 'S05-briefing');
  await click(p, 'Начать расследование');
  await handover(p);
  await expect(p.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
}
async function diary(p: Page) {
  await click(p, 'Обыск');
  await capture(p, 'S08-locations');
  await click(p, 'Кабинет');
  await capture(p, 'S08-office');
  await click(p, 'Письменный стол');
  await expect(
    p.getByRole('heading', { name: 'Ежедневник Аркадия' }),
  ).toBeVisible();
  await click(p, 'Назад');
  await click(p, 'Сейф');
  await expect(
    p.getByRole('heading', { name: 'Тайная бухгалтерия' }),
  ).toBeVisible();
  await capture(p, 'S09-clue');
  await click(p, 'Назад');
  await click(p, 'Назад');
}
async function accusation(p: Page, suspect: string, evidence?: string) {
  await click(p, 'Обвинить');
  await capture(p, 'S13-accusation');
  await p.getByLabel('Виновный').selectOption(suspect);
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-embezzlement');
  await click(p, 'Далее');
  await p
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-statuette');
  await click(p, 'Далее');
  if (evidence) await p.getByLabel(evidence, { exact: true }).check();
  await click(p, 'Предъявить обвинение');
}
test('одиночная партия офлайн до победы; сохранение и повторный запуск', async ({
  page,
  context,
}, info) => {
  await start(page);
  await diary(page);
  await page.goto('/');
  await click(page, 'Продолжить');
  await handover(page);
  await expect(page.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
  await context.setOffline(true);
  await accusation(page, 's-gleb', 'Тайная бухгалтерия');
  await expect(
    page.getByRole('heading', { name: 'Как всё было' }),
  ).toBeVisible();
  await expect(page.getByText('Победители: Детектив 1')).toBeVisible();
  await page.screenshot({
    path: `docs/devlog/assets/m2-fixes/classic/${info.project.name}-final.png`,
    fullPage: true,
  });
});
test('два игрока: защита передачи, ошибочное обвинение, выбывание, победа второго', async ({
  page,
}, info) => {
  await start(page, 2);
  await accusation(page, 's-vera');
  await expect(
    page.getByRole('heading', { name: 'Передайте телефон: Детектив 2' }),
  ).toBeVisible();
  const b = page.getByRole('button', { name: 'Детектив 2', exact: true });
  await b.click();
  await expect(
    page.getByRole('heading', { name: 'Передайте телефон: Детектив 2' }),
  ).toBeVisible();
  await handover(page);
  await diary(page);
  await accusation(page, 's-gleb', 'Тайная бухгалтерия');
  await expect(page.getByText('Победители: Детектив 2')).toBeVisible();
  await page.screenshot({
    path: `docs/devlog/assets/m2-fixes/classic/${info.project.name}-two-players.png`,
    fullPage: true,
  });
});
test('сворачивание закрывает блокнот и прямой адрес не обходит передачу', async ({
  page,
}) => {
  await start(page, 2);
  await diary(page);
  await click(page, 'Блокнот');
  await expect(
    page.getByRole('button', { name: 'Ежедневник Аркадия', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(
    page.getByRole('heading', { name: 'Передайте телефон: Детектив 1' }),
  ).toBeVisible();
  await page.goto('/#/s11');
  await expect(
    page.getByRole('heading', { name: 'Передайте телефон: Детектив 1' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ежедневник Аркадия', exact: true }),
  ).toBeHidden();
});

test('допрос: давление, слом, канонический факт и визуальная проверка экранов', async ({
  page,
}, info) => {
  const shot = async (name: string) => {
    const titles: Record<string, string> = {
      hub: 'Хаб хода',
      notebook: 'Блокнот',
      facts: 'Блокнот',
      timeline: 'Блокнот',
      suspects: 'Допрос',
      interrogation: 'Допрос',
      broken: 'Допрос',
      board: 'Общая доска',
    };
    const title = titles[name];
    if (title)
      await expect(
        page.getByRole('heading', { name: title, exact: true }),
      ).toBeVisible();
    await page.screenshot({
      path: `docs/devlog/assets/m2-fixes/classic/${info.project.name}-${name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  };
  await start(page);
  await shot('hub');
  await diary(page);
  await click(page, 'Блокнот');
  await shot('notebook');
  await click(page, 'Факты');
  await shot('facts');
  await click(page, 'Заметки');
  await page
    .getByRole('textbox', { name: 'Заметки' })
    .fill('Проверить показания Веры');
  await click(page, 'Сохранить заметку');
  await click(page, 'Хронология');
  await shot('timeline');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await shot('suspects');
  await click(page, 'Вера Орлова');
  await shot('interrogation');
  await page.getByRole('combobox', { name: 'Тон' }).selectOption('pressure');
  await click(page, 'Из-за чего вы ругались?');
  await click(page, 'Вам нужны деньги?');
  await page.getByRole('combobox', { name: 'Тон' }).selectOption('neutral');
  await click(page, 'Ежедневник Аркадия');
  await expect(page.getByText('Сломлен', { exact: false })).toBeVisible();
  await shot('broken');
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await click(page, 'Факты');
  await expect(page.getByText(/Уходя в 23:05/)).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Общая доска');
  await expect(page.getByText(/Я должна денег очень неприятным/)).toBeHidden();
  await shot('board');
});

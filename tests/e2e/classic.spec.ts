import { test, expect, type Page } from '@playwright/test';
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
    await b.dispatchEvent('pointerdown');
    await expect(p.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
  }
}
async function start(p: Page, count = 1) {
  await p.goto('/');
  await click(p, 'Новое дело');
  await click(p, 'Синяя сова');
  await p.getByLabel('Количество игроков').selectOption(String(count));
  await click(p, 'К брифингу');
  await click(p, 'Начать расследование');
  await handover(p);
  await expect(p.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
}
async function diary(p: Page) {
  await click(p, 'Обыск');
  await click(p, 'Кабинет');
  await click(p, 'Письменный стол');
  await expect(
    p.getByRole('heading', { name: 'Ежедневник Аркадия' }),
  ).toBeVisible();
  await click(p, 'Назад');
  await click(p, 'Сейф');
  await expect(
    p.getByRole('heading', { name: 'Тайная бухгалтерия' }),
  ).toBeVisible();
  await click(p, 'Назад');
  await click(p, 'Назад');
}
async function accusation(p: Page, suspect: string, evidence?: string) {
  await click(p, 'Обвинить');
  await p.getByLabel('Виновный').selectOption(suspect);
  await click(p, 'Далее');
  await p.getByLabel('Мотив', { exact: true }).selectOption('m-embezzlement');
  await click(p, 'Далее');
  await p.getByLabel('Способ', { exact: true }).selectOption('w-statuette');
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
    path: `docs/devlog/assets/m1/${info.project.name}-final.png`,
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
    path: `docs/devlog/assets/m1/${info.project.name}-two-players.png`,
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

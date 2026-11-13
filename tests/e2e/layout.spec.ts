import { test, expect, type Locator, type Page } from '@playwright/test';
const click = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).click();
async function fullWidth(button: Locator) {
  const layout = await button.evaluate((el) => {
    const parent = el.parentElement;
    if (!parent) throw new Error('Missing button parent');
    const rect = el.getBoundingClientRect();
    const parentStyle = getComputedStyle(parent);
    return {
      width: rect.width,
      available:
        parent.clientWidth -
        parseFloat(parentStyle.paddingLeft) -
        parseFloat(parentStyle.paddingRight),
      alignment: getComputedStyle(el).textAlign,
    };
  });
  expect(Math.abs(layout.width - layout.available)).toBeLessThanOrEqual(2);
  expect(layout.alignment).toBe('center');
}
test('основные кнопки по ширине экрана, меню отдельными строками с центрированием', async ({
  page,
}) => {
  await page.goto('/');
  const menu = page.locator('main > button');
  await expect(menu).toHaveCount(4);
  let previousBottom = 0;
  for (const button of await menu.all()) {
    await fullWidth(button);
    const rect = await button.boundingBox();
    if (!rect) throw new Error('Missing menu button');
    if (previousBottom)
      expect(rect.y - previousBottom).toBeGreaterThanOrEqual(12);
    previousBottom = rect.y + rect.height;
  }
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-menu-buttons.png`,
    fullPage: true,
  });
  await click(page, 'Настройки');
  for (const button of await page.locator('main button').all())
    await fullWidth(button);
  await click(page, 'Назад');
  await click(page, 'Новое дело');
  await fullWidth(
    page.getByRole('button', { name: 'Синяя сова', exact: true }),
  );
  await click(page, 'Синяя сова');
  for (const button of await page.locator('main button').all())
    await fullWidth(button);
  await click(page, 'К брифингу');
  await fullWidth(
    page.getByRole('button', { name: 'Начать расследование', exact: true }),
  );
  await click(page, 'Начать расследование');
  for (const button of await page.locator('main button').all())
    await fullWidth(button);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

import { test, expect } from '@playwright/test';
import { ru } from '../../src/i18n/ru';
test('главное меню, инструкция, настройки и выбор дела доступны без внешних запросов', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1'
      ? r.continue()
      : r.abort(),
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: ru.screens.S02.title }),
  ).toBeVisible();
  for (const title of [ru.game.help, ru.game.settings]) {
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/devlog/assets/m2/classic/${test.info().project.name}-${title === ru.game.help ? 'S16-help' : 'S15-settings'}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: ru.game.menu, exact: true }).click();
  }
  await page.getByRole('button', { name: ru.game.newGame }).click();
  await expect(
    page.getByRole('heading', { name: ru.game.choose }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

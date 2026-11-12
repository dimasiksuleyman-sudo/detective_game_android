import { test, expect } from '@playwright/test';
import { screens } from '../../src/screens/catalog';
import { ru } from '../../src/i18n/ru';

test('все 16 экранов доступны; переходы и перезагрузка работают без внешних запросов', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1')
      return route.abort();
    return route.continue();
  });
  await page.goto('/');
  for (const { id, path } of screens) {
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      ru.screens[id].title,
    );
    await expect(page).toHaveURL(new RegExp(`#${path}$`));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/devlog/assets/m0/${testInfo.project.name}-${id}.png`,
      fullPage: true,
    });
    await page.getByRole('link', { name: ru.nextScreen, exact: true }).click();
  }
  await page
    .getByRole('navigation')
    .getByRole('link', { name: ru.screens.S15.title, exact: true })
    .click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(
    ru.screens.S15.title,
  );
  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';
test('озвучка брифинга по нажатию, без финальных спойлеров, останавливается в фоне и при уходе', async ({
  page,
}, info) => {
  await page.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1'
      ? r.continue()
      : r.abort(),
  );
  await page.goto('/');
  await expect(page.locator('audio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Новое дело', exact: true }).click();
  await page.getByRole('button', { name: 'Синяя сова', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Лимит раундов', exact: true })
    .selectOption('6');
  await page.getByRole('button', { name: 'К брифингу', exact: true }).click();
  await expect(
    page.getByText('Лимит раундов: 6', { exact: true }),
  ).toBeVisible();
  const audio = page.locator('audio');
  await expect(audio).toHaveCount(1);
  await expect(audio).toHaveAttribute('preload', 'none');
  await expect(audio).toHaveAttribute('src', /briefing\.mp3$/);
  await expect(audio).toHaveJSProperty('paused', true);
  await audio.evaluate(async (el: HTMLAudioElement) => {
    await el.play();
  });
  await expect(audio).toHaveJSProperty('paused', false);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(audio).toHaveJSProperty('currentTime', 0);
  await page.evaluate(() =>
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    }),
  );
  await audio.evaluate(async (el: HTMLAudioElement) => {
    await el.play();
  });
  const element = await audio.elementHandle();
  await page.screenshot({
    path: `docs/devlog/assets/narration/${info.project.name}-briefing.png`,
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Начать расследование', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(0);
  expect(await element?.evaluate((el: HTMLAudioElement) => el.paused)).toBe(
    true,
  );
});

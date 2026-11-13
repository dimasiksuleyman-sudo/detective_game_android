import { test, expect } from '@playwright/test';
test('свайп по каждой локации прокручивает к нижним кнопкам и не тратит действие', async ({
  page,
  context,
}) => {
  await page.goto('/');
  for (const name of [
    'Новое дело',
    'Синяя сова',
    'К брифингу',
    'Начать расследование',
    'Обыск',
  ])
    await page.getByRole('button', { name, exact: true }).click();
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--safe-area-inset-bottom',
      '48px',
    ),
  );
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 1,
  });
  for (const location of ['Кабинет', 'Зал бара', 'Переулок у чёрного хода']) {
    await page.getByRole('button', { name: location, exact: true }).click();
    const image = page.getByRole('img', { name: location, exact: true });
    await image.evaluate((el: HTMLImageElement) => el.decode());
    await expect(page.locator('[data-screen="s08"]')).toHaveCSS(
      'padding-bottom',
      '64px',
    );
    const box = await image.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('Missing viewport');
    const x = box.x + box.width / 2;
    const start = Math.min(viewport.height - 70, box.y + box.height * 0.65);
    for (let gesture = 0; gesture < 2; gesture++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: start }],
      });
      for (let step = 1; step <= 8; step++)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: start - step * 35 }],
        });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    }
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
    const menu = page.getByRole('button', { name: 'В меню', exact: true });
    await expect(menu).toBeInViewport({ ratio: 1 });
    const bounds = await menu.boundingBox();
    if (!bounds) throw new Error('Missing menu');
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 48);
    await expect(
      page.getByRole('heading', { name: location, exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/screens/${test.info().project.name}-${location}-scroll.png`,
    });
    await page.getByRole('button', { name: 'Назад', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  // Свайпы не потратили действие: в хабе всё ещё «одно действие за ход», а не «Обыск: …».
  await expect(page.getByText(/^Одно действие за ход/)).toBeVisible();
});

import { test, expect, type Page } from '@playwright/test';
const click = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true }).click();

/** Доля элемента в видимой области окна: 1 — целиком на экране. */
const inView = (p: Page, selector: string) =>
  p
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      const visible =
        Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      return Math.max(0, visible) / Math.max(1, r.height);
    });

test('после вопроса экран возвращается к портрету: видны мимика и ответ', async ({
  page,
}) => {
  await page.goto('/');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await click(page, 'К брифингу');
  await click(page, 'Начать расследование');
  await click(page, 'Допрос');
  await click(page, 'Вера Орлова');
  const question = page.getByRole('button', {
    name: 'Где вы были после 23:00?',
    exact: true,
  });
  // Вопросы ниже портрета: прокручиваем к ним, как сделал бы игрок.
  await question.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await question.click();
  await expect(page.locator('.latestReply blockquote')).toContainText(
    '«Ржавом якоре» на набережной',
  );
  // Портрет подозреваемого и последний ответ одновременно на экране.
  await expect
    .poll(() => inView(page, 'section figure img'))
    .toBeGreaterThan(0.9);
  await expect.poll(() => inView(page, '.latestReply')).toBeGreaterThan(0.9);
});

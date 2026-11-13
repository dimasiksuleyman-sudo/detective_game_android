import { test, expect } from '@playwright/test';
import { enterSafeCode } from './safeHelpers';

test('S03: два дела, новая партия и продолжение сохраняют выбранный контент', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Новое дело', exact: true }).click();
  const pilot = page.getByRole('article').filter({
    has: page.getByRole('button', { name: 'Синяя сова', exact: true }),
  });
  await expect(pilot.locator('img')).toHaveAttribute(
    'src',
    /case-001-blue-owl/,
  );
  await expect(pilot).toContainText('Сложность: 1');
  await expect(pilot).toContainText('мин');
  await expect(
    page.getByRole('button', { name: 'Тестовое дело', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Тестовое дело', exact: true })
    .click();
  await expect(
    page.getByLabel('Количество игроков').locator('option'),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'К брифингу', exact: true }).click();
  await expect(
    page.getByText('Брифинг тестового дела.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Прослушать/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Начать расследование', exact: true })
    .click();
  await page.getByRole('button', { name: 'Обыск', exact: true }).click();
  await page.getByRole('button', { name: 'Кабинет', exact: true }).click();
  await page.getByRole('button', { name: 'Сейф', exact: true }).click();
  await expect(page.getByRole('spinbutton')).toHaveCount(3);
  await enterSafeCode(page, '000');
  await expect(page.getByText('Не подходит.', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveCount(3);
  await enterSafeCode(page, '214');
  await expect(
    page.getByRole('button', { name: 'Осмотреть предмет 1', exact: true }),
  ).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page
    .getByRole('button', { name: 'Детектив 1', exact: true })
    .dispatchEvent('pointerdown');
  await expect(
    page.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Обыск', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Зал', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Кабинет', exact: true }).click();
  await page.getByRole('button', { name: 'Сейф ✓', exact: true }).click();
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Осмотреть предмет 1', exact: true }),
  ).toBeVisible();
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'В меню', exact: true }).click();
  await page.getByRole('button', { name: 'Новое дело', exact: true }).click();
  await page.getByRole('button', { name: 'Синяя сова', exact: true }).click();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page
    .getByRole('button', { name: 'Детектив 1', exact: true })
    .dispatchEvent('pointerdown');
  await expect(
    page.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Обыск', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Зал', exact: true }),
  ).toHaveCount(0);
});

import { expect, type Page } from '@playwright/test';
/** Действия по новому замку для прежних сценариев, которые раньше получали бухгалтерию сразу. */
export async function enterSafeCode(p: Page, code = '1408') {
  for (let i = 0; i < code.length; i++) {
    const wheel = p.getByRole('spinbutton', {
      name: 'Колёсико ' + (i + 1),
      exact: true,
    });
    await wheel.focus();
    await wheel.press('Home');
    for (let n = 0; n < Number(code[i]); n++) await wheel.press('ArrowUp');
  }
  await p.getByRole('button', { name: 'Открыть сейф', exact: true }).click();
}
export async function collectLedger(p: Page) {
  await enterSafeCode(p);
  await p
    .getByRole('button', { name: 'Осмотреть предмет 1', exact: true })
    .click();
  await expect(
    p.getByRole('heading', { name: 'Тайная бухгалтерия', exact: true }),
  ).toBeVisible();
}
export async function backFromSafeItem(p: Page) {
  await p
    .getByRole('button', { name: 'К содержимому сейфа', exact: true })
    .click();
  await p.getByRole('button', { name: 'Назад', exact: true }).click();
}

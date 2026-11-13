/** Правила хода ADR-034: вся локация за ход, уведомления о конце попыток, блиц, итог обвинения. */
import { test, expect, type Page } from '@playwright/test';

const click = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true }).click();

async function start(p: Page, count = 1, timer?: string) {
  await p.goto('/');
  await click(p, 'Новое дело');
  await click(p, 'Синяя сова');
  await p.getByLabel('Количество игроков').selectOption(String(count));
  if (timer) await p.getByLabel('Время на ход').selectOption({ label: timer });
  await click(p, 'К брифингу');
  await click(p, 'Начать расследование');
  await takeTurn(p);
}
async function takeTurn(p: Page) {
  await expect(
    p.getByRole('heading', { name: /^(Хаб хода|Передайте телефон:)/ }),
  ).toBeVisible();
  const hold = p.getByRole('button', { name: /^Детектив \d$/ });
  if (await hold.count()) await hold.dispatchEvent('pointerdown');
  await expect(p.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
}

test('обыск: все зоны одной локации за ход, затем подсказка завершить ход', async ({
  page,
}) => {
  await start(page);
  await expect(page.getByText(/^Одно действие за ход/)).toBeVisible();
  await click(page, 'Обыск');
  await click(page, 'Зал бара');
  for (const zone of ['Старые фото', 'Доска объявлений', 'Стойка', 'Рояль']) {
    await click(page, zone);
    await click(page, 'Назад');
  }
  await expect(page.getByRole('alert')).toContainText(
    'вы осмотрели всё, что могли',
  );
  await click(page, 'Назад');
  // Другие локации в этот ход закрыты — и это сказано словами.
  await expect(
    page.getByText('За ход — одна локация: Зал бара.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Кабинет', exact: true }),
  ).toBeDisabled();
  await click(page, 'Назад');
  await expect(
    page.getByText('Обыск: Зал бара — осмотрено зон: 4', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('В этот ход вы уже обыскиваете — допрос в следующий ход.'),
  ).toBeVisible();
});

test('допрос: три реплики, затем «реплики закончились» и кнопка завершить ход', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  for (const q of [
    'Где вы были после 23:00?',
    'Какие у вас были отношения с Аркадием?',
    'Кто, по-вашему, мог это сделать?',
  ]) {
    const b = page.getByRole('button', { name: q, exact: true });
    await b.scrollIntoViewIfNeeded();
    await b.click();
    await expect(page.locator('.latestReply blockquote')).toBeVisible();
  }
  const done = page.getByRole('alert');
  await expect(done).toContainText('Реплики на этот ход закончились');
  await done.getByRole('button', { name: 'Завершить ход' }).click();
  await expect(page.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
  await expect(page.getByText(/^Одно действие за ход/)).toBeVisible();
});

test('блиц: таймер виден, по нулю — «Время вышло» и передача хода', async ({
  page,
}) => {
  await page.clock.install();
  await start(page, 2, '1 минута (блиц)');
  const timer = page.getByRole('timer');
  await expect(timer).toHaveText('⏱ 1:00');
  await page.clock.runFor(30_000);
  await expect(timer).toHaveText('⏱ 0:30');
  // Блокнот — тоже часть хода: время идёт.
  await click(page, 'Блокнот');
  await page.clock.runFor(31_000);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Время вышло');
  await click(page, 'Передать ход');
  await expect(
    page.getByRole('heading', { name: 'Передайте телефон: Детектив 2' }),
  ).toBeVisible();
  await takeTurn(page);
  await expect(page.getByRole('timer')).toHaveText('⏱ 1:00');
});

test('без блица таймера нет', async ({ page }) => {
  await start(page);
  await expect(page.getByRole('timer')).toHaveCount(0);
});

test('верная версия без улик: объяснение, игрок остаётся в игре', async ({
  page,
}) => {
  await start(page, 2);
  await click(page, 'Обвинить');
  await page.getByLabel('Виновный').selectOption('s-gleb');
  await click(page, 'Далее');
  await page
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-embezzlement');
  await click(page, 'Далее');
  await page
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-statuette');
  await click(page, 'Далее');
  await click(page, 'Предъявить обвинение');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Прокурор не примет дело без улик');
  await expect(dialog).toContainText('остаётесь в расследовании');
  await click(page, 'Понятно');
  await expect(page.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
});

async function wrongAccusation(page: Page) {
  await click(page, 'Обвинить');
  await page.getByLabel('Виновный').selectOption('s-vera');
  await click(page, 'Далее');
  await page
    .getByRole('combobox', { name: 'Мотив', exact: true })
    .selectOption('m-embezzlement');
  await click(page, 'Далее');
  await page
    .getByRole('combobox', { name: 'Способ', exact: true })
    .selectOption('w-statuette');
  await click(page, 'Далее');
  await click(page, 'Предъявить обвинение');
}

test('нераскрытое дело: разгадка не показывается без спроса; «нет» — новая партия того же дела', async ({
  page,
}) => {
  page.on('dialog', (d) => void d.accept());
  await start(page);
  await wrongAccusation(page);
  await expect(
    page.getByRole('heading', { name: 'Дело не раскрыто', exact: true }),
  ).toBeVisible();
  // Ни объяснения, ни реконструкции до явного согласия.
  await expect(
    page.getByRole('heading', { name: 'Как всё было', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Глеб Соколов два года');
  await click(page, 'Нет, сыграть ещё раз');
  await expect(
    page.getByRole('heading', { name: 'Настройка игроков' }),
  ).toBeVisible();
  await click(page, 'К брифингу');
  await expect(page.locator('main')).toContainText('Синяя сова');
});

test('нераскрытое дело: «да» показывает, как всё было', async ({ page }) => {
  await start(page);
  await wrongAccusation(page);
  await click(page, 'Да, показать разгадку');
  await expect(
    page.getByRole('heading', { name: 'Как всё было', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText('Глеб Соколов два года');
});

test('находка без улики подписана: название зоны, описание и что ушло в блокнот', async ({
  page,
}) => {
  await start(page);
  await click(page, 'Обыск');
  await click(page, 'Переулок у чёрного хода');
  await click(page, 'Чёрный ход');
  await expect(
    page.getByRole('heading', { name: 'Чёрный ход', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('В блокнот добавлено:')).toBeVisible();
  await expect(page.getByRole('listitem')).toContainText(
    'Замок чёрного хода не взломан',
  );
});

import { test, expect, type Page } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => {
    if (d.message().includes('не использовали действия')) void d.accept();
  });
});
const click = async (p: Page, name: string) => {
  const b = p.getByRole('button', { name, exact: true, includeHidden: true });
  await expect(b).toBeAttached();
  const details = b.locator('xpath=ancestor::details');
  if ((await details.count()) && !(await b.isVisible()))
    await details.locator('summary').click();
  await expect(b).toBeEnabled();
  await b.click();
};
async function setup(page: Page, fixture = '') {
  await page.route('**/*', (r) =>
    new URL(r.request().url()).hostname === '127.0.0.1'
      ? r.continue()
      : r.abort(),
  );
  await page.goto('/' + (fixture ? '?aiFixture=' + fixture : ''));
  await expect(
    page.getByText('Тестовый режим: MockAiClient, реальных запросов нет'),
  ).toBeVisible();
  await click(page, 'Настройки');
  await page
    .getByLabel('Ключ aitunnel', { exact: true })
    .fill('e2e-dummy-credential');
  await click(page, 'Проверить и сохранить ключ');
  await expect(page.getByText('Ключ проверен и сохранён')).toBeVisible();
  await expect(page.getByLabel('Ключ aitunnel', { exact: true })).toHaveValue(
    '',
  );
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-key-checked.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByLabel('Ключ aitunnel', { exact: true }),
  ).toHaveAttribute('placeholder', '•••••••• — ключ сохранён');
  await expect(page.getByLabel('Ключ aitunnel', { exact: true })).toHaveValue(
    '',
  );
  await click(page, 'В меню');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await page
    .getByRole('button', { name: 'ИИ · свободные вопросы', exact: true })
    .click();
  await click(page, 'К брифингу');
  await click(page, 'Начать расследование');
  await expect(page.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
}
test('MockAiClient: вопрос → разрешённый факт; слом озвучивается, сохранение не содержит ключ', async ({
  page,
}, info) => {
  await setup(page);
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Письменный стол');
  await expect(
    page.getByRole('heading', { name: 'Ежедневник Аркадия' }),
  ).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Вера Орлова');
  await page
    .getByRole('textbox', { name: 'Свободный вопрос' })
    .fill('Где вы были?');
  await click(page, 'Спросить ИИ');
  await expect(
    page.getByRole('blockquote').filter({
      hasText:
        'Вера выступала в клубе «Ржавый якорь» с 23:30 до 01:00 — это подтвердит весь зал.',
    }),
  ).toBeVisible();
  await page.getByText('Стоимость последней попытки', { exact: true }).click();
  await page.screenshot({
    path: `test-results/screens/${info.project.name}-ai-dialogue.png`,
    fullPage: true,
  });
  await page.getByRole('combobox', { name: 'Тон' }).selectOption('pressure');
  await click(page, 'Из-за чего вы ругались?');
  await click(page, 'Вам нужны деньги?');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Вера Орлова');
  await click(page, 'Ежедневник Аркадия');
  await expect(page.getByText('Сломлен', { exact: true })).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await click(page, 'Факты');
  await expect(page.getByText(/Уходя в 23:05/)).toBeVisible();
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('keyval-store');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise<string>((resolve, reject) => {
      const r = db.transaction('keyval').objectStore('keyval').getAll();
      r.onsuccess = () => {
        resolve(JSON.stringify(r.result));
        db.close();
      };
      r.onerror = () => reject(r.error);
    });
  });
  expect(stored).not.toContain('e2e-dummy-credential');
  await page.screenshot({
    path: `test-results/screens/${info.project.name}-ai-facts.png`,
    fullPage: true,
  });
});
test('сетевая ошибка или guard-фолбэк не расходует реплику; офлайн-вопрос доступен', async ({
  page,
}) => {
  await setup(page, 'network');
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  await page
    .getByRole('textbox', { name: 'Свободный вопрос' })
    .fill('Где вы были?');
  await click(page, 'Спросить ИИ');
  await expect(page.getByRole('alert')).toContainText('Нет связи');
  await click(page, 'Где вы были после 23:00?');
  await click(page, 'Какие у вас были отношения с Аркадием?');
  await click(page, 'Кто, по-вашему, мог это сделать?');
  await expect(
    page.getByRole('button', { name: 'Кому выгодна смерть Аркадия?' }),
  ).toBeDisabled();
});
test('ключ удаляется; AI отключён в новой партии, классика остаётся', async ({
  page,
}, info) => {
  await setup(page);
  page.on('dialog', (d) => d.accept());
  await click(page, 'В меню');
  await click(page, 'Настройки');
  await click(page, 'Удалить ключ');
  await expect(
    page.getByText(
      'Для ИИ нужен проверенный ключ. Офлайн-вопросы доступны без него.',
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/screens/${info.project.name}-settings.png`,
    fullPage: true,
  });
  await click(page, 'В меню');
  await click(page, 'Новое дело');
  await click(page, 'Синяя сова');
  await expect(
    page.getByRole('button', { name: 'ИИ · свободные вопросы', exact: true }),
  ).toBeDisabled();
});

test('предъявление в ИИ-партии работает офлайн без озвучивания и удаления ключа', async ({
  page,
  context,
}) => {
  await setup(page, 'network');
  await click(page, 'Обыск');
  await click(page, 'Кабинет');
  await click(page, 'Диван');
  await expect(
    page.getByRole('heading', { name: 'Билет на поезд' }),
  ).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Ольга Лебедева');
  await page
    .getByRole('checkbox', { name: 'Озвучивать предъявление через ИИ' })
    .uncheck();
  await context.setOffline(true);
  await click(page, 'Билет на поезд');
  await expect(page.getByText('Сломлен', { exact: true })).toBeVisible();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Блокнот');
  await click(page, 'Факты');
  await expect(
    page.getByText(/Ольга зарегистрировалась в гостинице/),
  ).toBeVisible();
});

test('ожидание видно, сворачивание отменяет запрос без игровой реплики', async ({
  page,
}) => {
  await setup(page, 'slow');
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  await page
    .getByRole('textbox', { name: 'Свободный вопрос' })
    .fill('Где вы были?');
  await click(page, 'Спросить ИИ');
  await expect(page.getByText('Подозреваемый печатает…')).toBeVisible();
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
  const hold = page.getByRole('button', { name: 'Детектив 1', exact: true });
  await expect(hold).toBeEnabled();
  await hold.dispatchEvent('pointerdown');
  await expect(page.getByRole('heading', { name: 'Хаб хода' })).toBeVisible();
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  await expect(page.getByRole('blockquote')).toHaveCount(0);
  await click(page, 'Где вы были после 23:00?');
  await click(page, 'Какие у вас были отношения с Аркадием?');
  await click(page, 'Кто, по-вашему, мог это сделать?');
  await expect(
    page.getByRole('button', { name: 'Кому выгодна смерть Аркадия?' }),
  ).toBeDisabled();
});

test('ИИ-форма первая, готовые вопросы свёрнуты; три запроса и новый ход', async ({
  page,
}) => {
  await setup(page);
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  const ready = page.getByRole('button', {
    name: 'Где вы были после 23:00?',
    exact: true,
  });
  await expect(ready).not.toBeVisible();
  const field = page.getByRole('textbox', { name: 'Свободный вопрос' });
  for (let i = 0; i < 3; i++) {
    await field.fill('Расскажите о себе');
    await click(page, 'Спросить ИИ');
    await expect(page.locator('.chat blockquote')).toHaveCount(i + 1);
  }
  await field.fill('Ещё вопрос');
  await expect(
    page.getByRole('button', { name: 'Спросить ИИ', exact: true }),
  ).toBeDisabled();
  await click(page, 'Назад');
  await click(page, 'Назад');
  await click(page, 'Завершить ход');
  await click(page, 'Допрос');
  await click(page, 'Глеб Соколов');
  await field.fill('Новый ход');
  await click(page, 'Спросить ИИ');
  await expect(page.locator('.chat blockquote')).toHaveCount(4);
});

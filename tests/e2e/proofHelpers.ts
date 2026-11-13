/**
 * ADR-035: победа в «Синей сове» требует мотива, возможности и признания Глеба.
 * Полный путь к признанию проверяется unit-тестом движка (rules.test.ts); e2e,
 * которые проверяют экраны финала, добавляют недостающие звенья прямо в сохранение.
 */
import { expect, type Page } from '@playwright/test';

export const PILOT_PROOF = {
  clues: ['c-ledger', 'c-parking-stub'],
  facts: ['f-ledger-signature', 'f-parking-2331', 'f-gleb-confessed'],
  labels: ['Тайная бухгалтерия', 'Парковочный талон', /^Глеб признался/],
};

/** Звенья цепочки «Номера семь»: расписка (мотив), просьба о соседнем номере (возможность), признание Надежды. */
export const ROOM_SEVEN_PROOF = {
  clues: ['c-receipt'],
  facts: ['f-nadia-asked', 'f-nadia-confession'],
};

/** Добавляет звенья цепочки «Синей совы» текущему игроку и продолжает партию. */
export async function grantPilotProof(p: Page, player = 0) {
  await grantProof(
    p,
    { clues: PILOT_PROOF.clues, facts: PILOT_PROOF.facts },
    player,
  );
}

/** Добавляет улики/факты игроку в сохранении и продолжает партию с экрана передачи. */
export async function grantProof(
  p: Page,
  proof: { clues: string[]; facts: string[] },
  player = 0,
) {
  await p.evaluate(
    async ({ proof, player }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('keyval-store');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      const saved = await new Promise<{
        state: { players: { clues: string[]; facts: string[] }[] };
      }>((resolve, reject) => {
        const req = store.get('interrogation-save-v1');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const p = saved.state.players[player];
      if (!p) throw new Error('player');
      p.clues = [...new Set([...p.clues, ...proof.clues])];
      p.facts = [...new Set([...p.facts, ...proof.facts])];
      store.put(saved, 'interrogation-save-v1');
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    { proof, player },
  );
  await p.goto('/');
  await p.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(
    p.getByRole('heading', { name: /^(Хаб хода|Передайте телефон:)/ }),
  ).toBeVisible();
  const hold = p.getByRole('button', { name: /^Детектив \d$/ });
  if (await hold.count()) await hold.dispatchEvent('pointerdown');
  await expect(
    p.getByRole('heading', { name: 'Хаб хода', exact: true }),
  ).toBeVisible();
}

/** Отмечает три доказательства — по одному на звено цепочки. */
export async function checkPilotProof(p: Page) {
  for (const label of PILOT_PROOF.labels)
    await p.getByRole('checkbox', { name: label }).check();
}

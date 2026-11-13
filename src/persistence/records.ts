/** Личные рекорды по делам (ADR-036): лучший счёт на этом устройстве, без сети. */
import { get, set } from 'idb-keyval';

const key = 'case-records-v1';

export async function loadRecords(): Promise<Record<string, number>> {
  try {
    return ((await get(key)) as Record<string, number> | undefined) ?? {};
  } catch {
    return {};
  }
}

/** Сохраняет счёт, если он больше прежнего рекорда дела. */
export async function submitRecord(caseId: string, points: number) {
  const records = await loadRecords();
  const best = records[caseId] ?? 0;
  if (points <= best) return { best, isNew: false, records };
  const next = { ...records, [caseId]: points };
  try {
    await set(key, next);
  } catch {
    // Рекорд — приятная мелочь: если хранилище недоступно, игра продолжается.
  }
  return { best: points, isNew: true, records: next };
}

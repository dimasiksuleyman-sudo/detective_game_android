/** Версионированное сохранение партии в IndexedDB, без ключей и сетевых запросов. */
import { pilot } from '../content/loader';
import { get, set, del } from 'idb-keyval';
import { z } from 'zod';
import { emptyAiUsage, type GameState } from '../game/engine';
const strings = z.array(z.string()),
  num = z.number().int().nonnegative();
const player = z.object({
  name: z.string(),
  color: z.string(),
  clues: strings,
  inspectedDetails: strings.default([]),
  facts: strings,
  visited: strings,
  asked: strings,
  truths: strings,
  broken: strings,
  notes: z.string(),
  emotions: z
    .record(
      z.string(),
      z.enum(['neutral', 'nervous', 'angry', 'sad', 'smug', 'broken']),
    )
    .default({}),
  stress: z.record(z.string(), num.max(10)),
  blocked: z.record(z.string(), num),
  turns: num,
  eliminated: z.boolean(),
  grace: z.boolean(),
  score: num,
  history: z.array(
    z.object({ suspect: z.string(), question: z.string(), answer: z.string() }),
  ),
});
const schema = z.object({
  caseId: z.string(),
  aiUsage: z
    .object({
      knownCostRub: z.number().nonnegative(),
      unknownCost: z.boolean(),
      lastCostRub: z.number().nonnegative().nullable(),
      balance: z.number().nonnegative().nullable(),
      attempts: num,
    })
    .default(emptyAiUsage),
  mode: z.enum(['classic', 'ai']).default('classic'),
  players: z.array(player).min(1).max(5),
  current: num,
  round: num.positive(),
  roundLimit: z.union([z.literal(6), z.literal(8), z.literal(10)]),
  phase: z.enum(['briefing', 'handover', 'turn', 'final', 'finished']),
  finalMode: z.boolean(),
  finalDone: z.array(num),
  winners: z.array(num),
  action: z
    .object({ kind: z.enum(['search', 'talk']), target: z.string(), used: num })
    .nullable(),
  board: z.array(z.object({ id: z.string(), by: num })),
  message: z.string(),
  hint: z.string(),
  started: z.boolean(),
});
const key = 'interrogation-save-v1';
export async function saveGame(state: GameState) {
  await set(key, { version: 2, state });
}
export function parseStoredGame(raw: unknown): GameState | null {
  if (raw === undefined) return null;
  const parsed = z
    .object({ version: z.union([z.literal(1), z.literal(2)]), state: schema })
    .parse(raw).state;
  if (
    parsed.current >= parsed.players.length ||
    parsed.caseId !== 'case-001-blue-owl'
  )
    throw new Error('Invalid save');
  // Прежние версии выдавали факт при находке. Не отбираем его и не заставляем искать заново.
  for (const p of parsed.players)
    for (const cl of pilot.clues) {
      if (!p.clues.includes(cl.id)) continue;
      for (const d of cl.inspection?.details ?? [])
        if (
          d.revealsFactIds.every((id) => p.facts.includes(id)) &&
          !p.inspectedDetails.includes(d.id)
        )
          p.inspectedDetails.push(d.id);
    }
  return parsed;
}
export async function loadGame(): Promise<GameState | null> {
  return parseStoredGame(await get(key));
}
export async function clearGame() {
  await del(key);
}

/**
 * Правила лимитов хода (ADR-034). Чистые функции — общие для движка и экранов,
 * чтобы подсказки игроку («реплики закончились») не расходились с тем, что разрешает движок.
 *
 * За ход игрок выбирает одно действие:
 * - обыск ОДНОЙ локации — можно осмотреть все её зоны;
 * - допрос ОДНОГО подозреваемого — до трёх реплик.
 */
import type { CaseFile } from '../../content/schema';
import type { GameState, Player } from '../engine';

export const TALK_LIMIT = 3;
/** Режим блиц: секунды на ход; 0 — без ограничения. */
export const TURN_SECONDS = [0, 60, 120] as const;
export type TurnSeconds = (typeof TURN_SECONDS)[number];

/**
 * Зоны локации, с которыми игрок ещё может что-то сделать в этот ход:
 * не осмотренные обычные зоны и не открытые замки. Зоны, закрытые фактом,
 * который игрок не знает, не считаются — их нельзя осмотреть.
 */
export function openHotspots(c: CaseFile, p: Player, locationId: string) {
  const l = c.locations.find((x) => x.id === locationId);
  return (l?.hotspots ?? []).filter((h) =>
    h.lock
      ? !p.openedLocks.includes(h.id)
      : !p.visited.includes(h.id) &&
        (!h.requiresFactId || p.facts.includes(h.requiresFactId)),
  );
}

export type TurnBudget =
  | { kind: 'none' }
  | { kind: 'search'; target: string; used: number; exhausted: boolean }
  | {
      kind: 'talk';
      target: string;
      used: number;
      limit: number;
      exhausted: boolean;
    };

/** Сколько уже сделано в этом ходу и закончились ли возможности. */
export function turnBudget(c: CaseFile, s: GameState): TurnBudget {
  const p = s.players[s.current];
  const a = s.action;
  if (!a || !p) return { kind: 'none' };
  if (a.kind === 'search')
    return {
      kind: 'search',
      target: a.target,
      used: a.used,
      exhausted: openHotspots(c, p, a.target).length === 0,
    };
  return {
    kind: 'talk',
    target: a.target,
    used: a.used,
    limit: TALK_LIMIT,
    exhausted: a.used >= TALK_LIMIT || p.blocked[a.target] !== undefined,
  };
}

/** Лимиты хода, итог обвинения и блиц (ADR-034) — без UI. */
import { describe, expect, it } from 'vitest';
import { loadCase } from '../../content/loader';
import { reduce, type GameState, type Action } from '../engine';
import { parseStoredGame } from '../../persistence/save';
import { accusationOutcome } from './accusation';
import { TALK_LIMIT, turnBudget } from './turn';

const c = loadCase('case-001-blue-owl');
const run = (s: GameState | null, a: Action) => {
  const r = reduce(c, s, a);
  if (!r) throw Error('state');
  return r;
};
const start = (n = 2, turnSeconds: 0 | 60 | 120 = 0) => {
  let s = run(null, {
    type: 'START_GAME',
    names: Array.from({ length: n }, (_, i) => 'Игрок ' + i),
    roundLimit: 6,
    turnSeconds,
  });
  s = run(s, { type: 'BEGIN_TURN' });
  if (s.phase === 'handover') s = run(s, { type: 'BEGIN_TURN' });
  return s;
};
const wrong = {
  suspectId: 's-vera',
  motiveId: c.solution.motiveId,
  methodId: c.solution.methodId,
  evidence: [],
};
const right = {
  suspectId: c.solution.culpritId,
  motiveId: c.solution.motiveId,
  methodId: c.solution.methodId,
  evidence: [],
};

describe('лимиты хода', () => {
  it('до хода — действия нет; допрос — три реплики, потом «закончились»', () => {
    let s = start(1);
    expect(turnBudget(c, s)).toEqual({ kind: 'none' });
    for (const id of ['q-gleb-1', 'q-gleb-2', 'q-gleb-3']) {
      s = run(s, {
        type: 'ASK_OFFLINE_QUESTION',
        suspectId: 's-gleb',
        questionId: id,
        tone: 'neutral',
      });
    }
    expect(turnBudget(c, s)).toEqual({
      kind: 'talk',
      target: 's-gleb',
      used: TALK_LIMIT,
      limit: TALK_LIMIT,
      exhausted: true,
    });
  });
});

describe('итог обвинения объясняется, но не выдаёт ответ', () => {
  it('неверная версия — выбывание; верная без улики — одно предупреждение', () => {
    const s = start(2);
    const p = s.players[s.current];
    if (!p) throw Error('player');
    expect(accusationOutcome(c, s, p, wrong)).toBe('eliminated');
    expect(accusationOutcome(c, s, p, right)).toBe('grace');
    const after = run(s, { type: 'ACCUSE', ...right });
    const p2 = after.players[after.current];
    if (!p2) throw Error('player');
    expect(p2.grace).toBe(true);
    expect(accusationOutcome(c, after, p2, right)).toBe('eliminated');
  });
  it('в финальном обвинении экран говорит только «записано»', () => {
    const s = { ...start(2), finalMode: true };
    const p = s.players[s.current];
    if (!p) throw Error('player');
    expect(accusationOutcome(c, s, p, wrong)).toBe('recorded');
    expect(
      accusationOutcome(c, s, p, {
        ...right,
        evidence: [c.solution.keyEvidence[0] ?? ''],
      }),
    ).toBe('recorded');
  });
  it('выбывание в движке совпадает с прогнозом экрана', () => {
    const s = start(2);
    const after = run(s, { type: 'ACCUSE', ...wrong });
    expect(after.players[0]?.eliminated).toBe(true);
    expect(after.current).toBe(1);
  });
});

describe('режим блиц', () => {
  it('время на ход сохраняется в партии; неверное значение отклоняется', () => {
    expect(start(1, 60).turnSeconds).toBe(60);
    expect(start(1).turnSeconds).toBe(0);
    expect(
      reduce(c, null, {
        type: 'START_GAME',
        names: ['A'],
        roundLimit: 6,
        turnSeconds: 30 as 60,
      }),
    ).toBeNull();
  });
  it('старое сохранение без времени на ход читается как «без ограничения»', () => {
    const s = start(1, 120) as Partial<GameState>;
    delete s.turnSeconds;
    expect(parseStoredGame({ version: 4, state: s })?.turnSeconds).toBe(0);
  });
});

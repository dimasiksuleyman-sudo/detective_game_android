/** Лимиты хода, итог обвинения и блиц (ADR-034) — без UI. */
import { describe, expect, it } from 'vitest';
import { loadCase } from '../../content/loader';
import { reduce, type GameState, type Action } from '../engine';
import { parseStoredGame } from '../../persistence/save';
import { accusationOutcome, judgeAccusation } from './accusation';
import { scoreAccusation } from './scoring';
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

describe('цепочка доказательств и признание (ADR-035)', () => {
  const present = (s: GameState) =>
    run(s, {
      type: 'PRESENT_CLUE',
      suspectId: 's-gleb',
      clueId: 'c-statuette',
      tone: 'neutral',
    });
  it('статуэтка ломает Глеба только после денег и возвращения', () => {
    let s = start(1);
    const p = s.players[0];
    if (!p) throw Error('player');
    p.clues = ['c-statuette', 'c-ledger', 'c-parking-stub'];
    p.facts = ['f-statuette-weapon'];
    p.stress['s-gleb'] = 6;
    s = present(s);
    expect(s.players[0]?.facts).not.toContain('f-gleb-confessed');
    const q = s.players[0];
    if (!q) throw Error('player');
    q.facts.push('f-gleb-returned', 'f-gleb-took-money');
    q.stress['s-gleb'] = 6;
    s = present(s);
    expect(s.players[0]?.facts).toContain('f-gleb-confessed');
    expect(s.players[0]?.truths).toContain('t-killed');
  });
  it('ADR-036: убийца, мотив и одна улика — дело принято; признание удваивает очки', () => {
    const s = start(2);
    const p = s.players[0];
    if (!p) throw Error('player');
    const partial = { ...right, evidence: ['c-ledger'] };
    expect(accusationOutcome(c, s, p, partial)).toBe('accepted');
    expect(judgeAccusation(c, partial).missing).toEqual([
      'Возможность',
      'Признание',
    ]);
    const t = { round: 3, roundLimit: 8, finalMode: false };
    // 10 + способ 5 + скорость 5.
    expect(scoreAccusation(c, partial, t).total).toBe(20);
    const full = {
      ...partial,
      evidence: ['c-ledger', 'c-parking-stub', 'f-gleb-confessed'],
    };
    // (10 + 5 + 2 улики × 3 + 5) × 2.
    expect(scoreAccusation(c, full, t)).toMatchObject({
      confession: true,
      total: 52,
    });
    // Неверный способ — без бонуса, но дело принято.
    expect(
      scoreAccusation(c, { ...partial, methodId: 'w-poison' }, t).total,
    ).toBe(15);
  });
  it('соревнование: принявший дело больше не ходит, партия идёт, побеждает лучший счёт', () => {
    let s = start(2);
    s = run(s, { type: 'ACCUSE', ...right, evidence: [] });
    expect(s.players[0]?.grace).toBe(true);
    const p0 = s.players[0];
    if (!p0) throw Error('player');
    p0.clues.push('c-ledger');
    s = run(s, { type: 'ACCUSE', ...right, evidence: ['c-ledger'] });
    expect(s.players[0]?.solved).toBe(true);
    expect(s.phase).not.toBe('finished');
    expect(s.current).toBe(1);
    s = run(s, { type: 'BEGIN_TURN' });
    const p1 = s.players[1];
    if (!p1) throw Error('player');
    p1.clues.push('c-ledger', 'c-parking-stub');
    s = run(s, { type: 'END_TURN' });
    // Игрок 0 сдал дело — ход снова у игрока 1, раунд растёт.
    expect(s.current).toBe(1);
    s = run(s, { type: 'BEGIN_TURN' });
    s = run(s, {
      type: 'ACCUSE',
      ...right,
      evidence: ['c-ledger', 'c-parking-stub'],
    });
    expect(s.phase).toBe('finished');
    expect(s.winners).toEqual([1]);
    expect(s.players[1]?.score).toBeGreaterThan(s.players[0]?.score ?? 0);
  });
  it('слом под давлением: при стрессе 9 Глебу хватает статуэтки и одной находки', () => {
    let s = start(1);
    const p = s.players[0];
    if (!p) throw Error('player');
    p.clues = ['c-statuette'];
    p.facts = ['f-statuette-weapon'];
    p.stress['s-gleb'] = 8;
    const present = (x: GameState) =>
      run(x, {
        type: 'PRESENT_CLUE',
        suspectId: 's-gleb',
        clueId: 'c-statuette',
        tone: 'neutral',
      });
    expect(present(s).players[0]?.facts).not.toContain('f-gleb-confessed');
    const q = s.players[0];
    if (!q) throw Error('player');
    q.stress['s-gleb'] = 9;
    s = present(s);
    expect(s.players[0]?.facts).toContain('f-gleb-confessed');
  });
  it('мутная квитанция не оправдывает и не обвиняет Тимура сама по себе', () => {
    const f = c.facts.find((x) => x.id === 'f-key-copy');
    expect(f?.importance).toBe('red_herring');
    expect(c.solution.proofChain?.flatMap((l) => l.evidenceIds)).not.toContain(
      'f-key-copy',
    );
  });
});

/** Правила проверяются действиями движка, без UI, сети и LLM. */
import { parseStoredGame } from '../persistence/save';
import { MockAiClient } from '../ai/client';
import { describe, it, expect } from 'vitest';
import { loadCase } from '../content/loader';
const c = loadCase('case-001-blue-owl');
import { reduce, type GameState, type Action } from './engine';
import { turnBudget } from './rules/turn';
function game(n = 1) {
  const s = reduce(c, null, {
    type: 'START_GAME',
    names: Array.from({ length: n }, (_, i) => 'Игрок ' + i),
    roundLimit: 6,
  });
  if (!s) throw Error('start');
  return s;
}
function run(s: GameState, a: Action) {
  const result = reduce(c, s, a);
  if (!result) throw Error('state');
  return result;
}
function active(n = 1) {
  let s = run(game(n), { type: 'BEGIN_TURN' });
  if (s.phase === 'handover') s = run(s, { type: 'BEGIN_TURN' });
  return s;
}
function player(s: GameState) {
  const p = s.players[s.current];
  if (!p) throw Error('player');
  return p;
}
const search = (s: GameState, id: string, loc = 'l-office') =>
  run(s, { type: 'SEARCH_HOTSPOT', locationId: loc, hotspotId: id });
const ask = (
  s: GameState,
  id = 'q-gleb-1',
  tone: 'neutral' | 'pressure' | 'empathy' = 'pressure',
) =>
  run(s, {
    type: 'ASK_OFFLINE_QUESTION',
    suspectId: 's-gleb',
    questionId: id,
    tone,
  });
const present = (s: GameState, id = 'c-parking-stub', suspect = 's-gleb') =>
  run(s, {
    type: 'PRESENT_CLUE',
    suspectId: suspect,
    clueId: id,
    tone: 'neutral',
  });
const accuse = (
  s: GameState,
  override: Partial<Extract<Action, { type: 'ACCUSE' }>> = {},
) =>
  run(s, {
    type: 'ACCUSE',
    suspectId: 's-gleb',
    motiveId: 'm-embezzlement',
    methodId: 'w-statuette',
    evidence: [],
    ...override,
  });
describe('правила партии', () => {
  it('валидирует начало и JSON roundtrip; без состояния действия безопасны', () => {
    for (const names of [[], [''], Array(6).fill('X'), ['x'.repeat(31)]])
      expect(
        reduce(c, null, { type: 'START_GAME', names, roundLimit: 8 }),
      ).toBeNull();
    expect(
      reduce(c, null, { type: 'START_GAME', names: ['x'], roundLimit: 3 }),
    ).toBeNull();
    expect(reduce(c, null, { type: 'BEGIN_TURN' })).toBeNull();
    expect(JSON.parse(JSON.stringify(game()))).toEqual(game());
  });
  it('не изменяет вход и запрещает действия до начала/после финала', () => {
    const s = game(),
      copy = structuredClone(s);
    expect(search(s, 'h-desk')).toEqual(s);
    expect(s).toEqual(copy);
    const f = active();
    f.phase = 'finished';
    expect(search(f, 'h-desk')).toEqual(f);
  });
  it('solo без передачи; мультиплеер с передачей; повтор BEGIN не сбрасывает лимиты', () => {
    expect(active().phase).toBe('turn');
    let s = run(game(2), { type: 'BEGIN_TURN' });
    expect(s.phase).toBe('handover');
    s = run(s, { type: 'BEGIN_TURN' });
    s = search(s, 'h-desk');
    expect(run(s, { type: 'BEGIN_TURN' }).action).toEqual(s.action);
  });
  it('обыск: сейф, выдача фактов, повтор, чужая локация, вся локация за ход (ADR-034)', () => {
    let s = active();
    expect(search(s, 'missing')).toEqual(s);
    s = search(s, 'h-safe');
    expect(s.action).toBeNull();
    expect(player(s).openedLocks).toEqual([]);
    s = search(s, 'h-desk');
    expect(player(s).facts).toContain('f-safe-hint');
    expect(search(s, 'h-desk')).toEqual(s);
    expect(search(s, 'h-photos', 'l-hall')).toEqual(s);
    s = run(s, {
      type: 'OPEN_LOCK',
      locationId: 'l-office',
      hotspotId: 'h-safe',
      code: '1408',
    });
    s = run(s, {
      type: 'TAKE_CONTAINER_ITEM',
      hotspotId: 'h-safe',
      clueId: 'c-ledger',
    });
    expect(player(s).score).toBe(4);
    expect(turnBudget(c, s)).toMatchObject({
      kind: 'search',
      exhausted: false,
    });
    // Вся локация за один ход: оставшиеся зоны кабинета доступны, другие локации и допрос — нет.
    for (const id of ['h-floor', 'h-sofa', 'h-window']) {
      const before = s;
      s = search(s, id);
      expect(s).not.toEqual(before);
    }
    expect(player(s).visited).toEqual(
      expect.arrayContaining(['h-desk', 'h-floor', 'h-sofa', 'h-window']),
    );
    expect(turnBudget(c, s)).toMatchObject({
      kind: 'search',
      target: 'l-office',
      exhausted: true,
    });
    expect(search(s, 'h-photos', 'l-hall')).toEqual(s);
    expect(ask(s)).toEqual(s);
  });
  it('осмотр без улики; независимость блокнотов, пропуск выбывших, номер раунда', () => {
    let s = search(active(2), 'h-door', 'l-alley');
    expect(player(s).facts).toContain('f-door-key');
    s = run(s, { type: 'END_TURN' });
    expect(s.current).toBe(1);
    expect(s.message).toBe('');
    expect(player(s).facts).toEqual([]);
    s = run(s, { type: 'BEGIN_TURN' });
    if (s.players[0]) s.players[0].eliminated = true;
    s = run(s, { type: 'END_TURN' });
    expect(s.current).toBe(1);
    expect(s.round).toBe(2);
  });
  it('вопросы: требования, повтор, чужой target, три реплики, отрицательный тон', () => {
    let s = active();
    expect(ask(s, 'q-gleb-6')).toEqual(s);
    expect(ask(s, 'missing')).toEqual(s);
    s = ask(s);
    expect(player(s).stress['s-gleb']).toBe(3);
    expect(ask(s)).toEqual(s);
    s = ask(s, 'q-gleb-2', 'empathy');
    expect(player(s).stress['s-gleb']).toBe(2);
    s = ask(s, 'q-gleb-3', 'neutral');
    expect(player(s).facts).toContain('f-timur-fired');
    expect(ask(s, 'q-gleb-4')).toEqual(s);
    expect(search(s, 'h-desk')).toEqual(s);
  });
  it('требование улики у вопроса', () => {
    const s = active();
    const a: Action = {
      type: 'ASK_OFFLINE_QUESTION',
      suspectId: 's-vera',
      questionId: 'q-vera-6',
      tone: 'neutral',
    };
    expect(run(s, a)).toEqual(s);
    player(s).clues.push('c-diary');
    expect(run(s, a).action?.used).toBe(1);
  });
  it('брейкпоинт требует улику, факт и стресс; слом даёт очко один раз', () => {
    let s = active();
    expect(present(s)).toEqual(s);
    player(s).clues = ['c-parking-stub'];
    s = present(s);
    expect(player(s).broken).toEqual([]);
    s.action = null;
    player(s).facts = ['f-gleb-car-plate'];
    s = present(s);
    expect(player(s).stress['s-gleb']).toBe(2);
    s.action = null;
    player(s).stress['s-gleb'] = 6;
    s = present(s);
    expect(player(s).facts).toContain('f-gleb-returned');
    expect(player(s).score).toBe(1);
    s = present(s);
    expect(player(s).score).toBe(1);
  });
  it('ignoreStress; нейтральная реакция; правильный target', () => {
    let s = active();
    player(s).clues = ['c-train-ticket', 'c-statuette'];
    s = present(s, 'c-train-ticket', 's-olga');
    expect(player(s).facts).toContain('f-olga-hotel');
    expect(present(s, 'c-statuette')).toEqual(s);
  });
  it('адвокат блокирует один следующий свой ход; затем восстановление до 6', () => {
    let s = active();
    player(s).stress['s-gleb'] = 9;
    s = ask(s);
    expect(player(s).stress['s-gleb']).toBe(10);
    expect(ask(s, 'q-gleb-2')).toEqual(s);
    s = run(s, { type: 'END_TURN' });
    expect(player(s).blocked['s-gleb']).toBeDefined();
    s = run(s, { type: 'END_TURN' });
    expect(player(s).blocked['s-gleb']).toBeUndefined();
    expect(player(s).stress['s-gleb']).toBe(6);
  });
  it('естественное спадание стресса и нижняя граница', () => {
    let s = ask(active(), 'q-gleb-2', 'empathy');
    expect(player(s).stress['s-gleb']).toBe(0);
    player(s).stress['s-gleb'] = 4;
    s = run(s, { type: 'END_TURN' });
    expect(player(s).stress['s-gleb']).toBe(3);
  });
  it('публикация только своих данных, один балл за карточку, заметки ограничены', () => {
    let s = active();
    expect(
      run(s, { type: 'PUBLISH_TO_BOARD', id: 'f-double-books' }).board,
    ).toEqual([]);
    s = search(s, 'h-desk');
    s = run(s, { type: 'PUBLISH_TO_BOARD', id: 'c-diary' });
    s = run(s, { type: 'PUBLISH_TO_BOARD', id: 'c-diary' });
    expect(player(s).score).toBe(3);
    expect(s.board).toEqual([{ id: 'c-diary', by: 0 }]);
    expect(
      player(run(s, { type: 'ADD_NOTE', text: 'a'.repeat(6000) })).notes.length,
    ).toBe(5000);
  });
  it('одна поблажка без ключевого доказательства; вторая исключает', () => {
    let s = accuse(active());
    expect(s.message).toContain('Прокурор');
    expect(player(s).grace).toBe(true);
    s = accuse(s);
    expect(s.phase).toBe('finished');
    expect(s.winners).toEqual([]);
  });
  it('победа и очки; неправильное обвинение исключает, следующий игрок получает ход', () => {
    let s = active();
    player(s).clues = ['c-ledger'];
    s = accuse(s, { evidence: ['c-ledger'] });
    expect(s.winners).toEqual([0]);
    expect(player(s).score).toBe(10);
    expect(s.phase).toBe('finished');
    let m = active(2);
    m = accuse(m, { suspectId: 's-vera' });
    expect(m.players[0]?.eliminated).toBe(true);
    expect(m.current).toBe(1);
  });
  it('отвергает поддельные, повторные и слишком многочисленные доказательства и варианты', () => {
    const s = active();
    for (const evidence of [['c-ledger'], ['x', 'x'], ['a', 'b', 'c', 'd']])
      expect(accuse(s, { evidence })).toEqual(s);
    for (const field of ['suspectId', 'motiveId', 'methodId'])
      expect(accuse(s, { [field]: 'bad' })).toEqual(s);
  });
  it('финальные обвинения всех оставшихся без штрафа; несколько победителей', () => {
    let s = active(2);
    s.round = 6;
    s.current = 1;
    s = run(s, { type: 'END_TURN' });
    expect(s.finalMode).toBe(true);
    for (let i = 0; i < 2; i++) {
      s = run(s, { type: 'BEGIN_TURN' });
      player(s).facts = ['f-keys-holders'];
      s = accuse(s, { evidence: ['f-keys-holders'] });
    }
    expect(s.phase).toBe('finished');
    expect(s.winners).toEqual([0, 1]);
  });
  it('финальная ошибка не исключает; финальные END и поиск не доступны', () => {
    let s = active();
    s.round = 6;
    s = run(s, { type: 'END_TURN' });
    expect(search(s, 'h-desk')).toEqual(s);
    expect(run(s, { type: 'END_TURN' })).toEqual(s);
    s = accuse(s, { suspectId: 's-vera' });
    expect(s.phase).toBe('finished');
    expect(player(s).eliminated).toBe(false);
  });
  it('подсказки зависят от общей находки; LOCK и возврат не начинают ход повторно', () => {
    let s = active(2);
    s.round = 3;
    s = run(s, { type: 'END_TURN' });
    expect(s.hint).toContain('стол');
    s = run(s, { type: 'BEGIN_TURN' });
    s = run(s, { type: 'LOCK' });
    expect(s.phase).toBe('handover');
    const turns = player(s).turns;
    s = run(s, { type: 'BEGIN_TURN' });
    expect(player(s).turns).toBe(turns);
  });
  it('подготовленная граница ИИ фильтрует неизвестные факты, фолбэк бесплатен', async () => {
    let s = active();
    const a: Action = {
      type: 'ASK_AI_QUESTION_RESULT',
      suspectId: 's-gleb',
      reply: 'Ответ мока',
      factIds: ['f-gleb-left', 'f-double-books', 'bad'],
      stressDelta: 100,
      tone: 'neutral',
      valid: false,
    };
    expect(run(s, a)).toEqual(s);
    const result = await new MockAiClient({
      reply: a.reply,
      factIds: a.factIds,
      stressDelta: a.stressDelta,
      valid: true,
    }).ask('Вопрос теста');
    s = run(s, { ...a, ...result });
    expect(player(s).facts).toEqual(['f-gleb-left']);
    expect(player(s).stress['s-gleb']).toBe(2);
  });
});

it('В обоих режимах три реплики; новый ход сбрасывает бюджет', () => {
  for (const mode of ['ai', 'classic'] as const) {
    let s = run(game(), { type: 'BEGIN_TURN' });
    s.mode = mode;
    const action: Action = {
      type: 'ASK_AI_QUESTION_RESULT',
      suspectId: 's-gleb',
      reply: 'Ответ',
      factIds: [],
      stressDelta: 0,
      tone: 'neutral',
      valid: true,
    };
    const limit = 3;
    for (let i = 0; i < limit; i++) s = run(s, action);
    expect(s.action?.used).toBe(limit);
    expect(run(s, action)).toBe(s);
    s = run(s, { type: 'END_TURN' });
    s = run(s, { type: 'BEGIN_TURN' });
    expect(run(s, action).action?.used).toBe(1);
  }
});
it('пять игроков имеют разные цвета и проходят передачу по очереди', () => {
  let s = run(game(5), { type: 'BEGIN_TURN' });
  expect(new Set(s.players.map((p) => p.color)).size).toBe(5);
  expect(parseStoredGame({ version: 1, state: s })?.players).toHaveLength(5);
  for (let i = 0; i < 5; i++) {
    s = run(s, { type: 'BEGIN_TURN' });
    expect(s.current).toBe(i);
    s = run(s, { type: 'END_TURN' });
  }
  expect(s.round).toBe(2);
});

describe('осмотр найденной улики', () => {
  const inspect = (s: GameState, x = 0.15, y = 0.72) =>
    run(s, { type: 'INSPECT_CLUE', clueId: 'c-statuette', x, y });
  it('владение/координаты/фаза, отдельное открытие и отсутствие повторных наград', () => {
    let s = active(2);
    expect(inspect(s)).toBe(s);
    s = search(s, 'h-floor');
    expect(player(s).facts).not.toContain('f-statuette-weapon');
    const before = structuredClone(s);
    for (const [x, y] of [
      [0.9, 0.1],
      [NaN, 0.72],
      [0.15, Infinity],
    ])
      expect(inspect(s, x, y)).toBe(s);
    s = inspect(s);
    expect(player(s).facts).toContain('f-statuette-weapon');
    expect(player(s).inspectedDetails).toEqual(['d-statuette-chip']);
    expect(s.action).toEqual(before.action);
    expect(player(s).score).toBe(player(before).score);
    expect(s.players[1]?.facts).not.toContain('f-statuette-weapon');
    expect(inspect(s)).toBe(s);
    const locked = run(before, { type: 'LOCK' });
    expect(inspect(locked)).toBe(locked);
    const final = { ...before, phase: 'final' as const, finalMode: true };
    expect(inspect(final)).toBe(final);
  });
  it('второй игрок самостоятельно находит ту же деталь', () => {
    let s = inspect(search(active(2), 'h-floor'));
    s = run(s, { type: 'END_TURN' });
    s = run(s, { type: 'BEGIN_TURN' });
    expect(s.current).toBe(1);
    expect(inspect(s)).toBe(s);
    s = search(s, 'h-floor');
    expect(player(s).facts).not.toContain('f-statuette-weapon');
    s = inspect(s);
    expect(player(s).inspectedDetails).toEqual(['d-statuette-chip']);
    expect(s.action?.used).toBe(1);
  });
  it('старое сохранение сохраняет уже открытый факт и помечает деталь, новое roundtrip читает v3', () => {
    const state = search(active(), 'h-floor');
    const legacy = JSON.parse(JSON.stringify(state));
    delete legacy.players[0].inspectedDetails;
    legacy.players[0].facts.push('f-statuette-weapon');
    const migrated = parseStoredGame({ version: 1, state: legacy });
    expect(migrated?.players[0]?.facts).toContain('f-statuette-weapon');
    expect(migrated?.players[0]?.inspectedDetails).toEqual([
      'd-statuette-chip',
    ]);
    expect(
      parseStoredGame({ version: 2, state: inspect(state) })?.players[0]
        ?.inspectedDetails,
    ).toEqual(['d-statuette-chip']);
    expect(() => parseStoredGame({ version: 5, state })).toThrow();
  });
  it('ИИ не может открыть факт детали до осмотра даже при ошибочной shareable-конфигурации', () => {
    const altered = structuredClone(c);
    const suspect = altered.suspects.find((x) => x.id === 's-gleb');
    if (!suspect) throw Error('suspect');
    suspect.shareableFactIds.push('f-statuette-weapon');
    const s = reduce(altered, active(), {
      type: 'ASK_AI_QUESTION_RESULT',
      suspectId: 's-gleb',
      reply: 'Не знаю.',
      factIds: ['f-statuette-weapon'],
      stressDelta: 0,
      tone: 'neutral',
      valid: true,
    });
    expect(s?.players[0]?.facts).not.toContain('f-statuette-weapon');
  });
});

it('START_GAME сохраняет текущую партию без явного подтверждения перезаписи', () => {
  const current = game();
  const next = { type: 'START_GAME', names: ['Новый'], roundLimit: 6 } as const;
  expect(reduce(c, current, { ...next, names: [...next.names] })).toBe(current);
  expect(
    reduce(c, current, { ...next, names: [...next.names], overwrite: true })
      ?.players[0]?.name,
  ).toBe('Новый');
});

it('после раскрытия темы все помеченные вопросы дают правду, до раскрытия — прежний ответ', () => {
  for (const suspect of c.suspects)
    for (const q of suspect.offlineQA) {
      if (!q.afterBreak) continue;
      for (const known of [false, true]) {
        const s = active();
        const p = player(s);
        p.facts = c.facts.map((f) => f.id);
        p.clues = c.clues.map((cl) => cl.id);
        if (known) p.truths.push(q.afterBreak.truthId);
        const next = run(s, {
          type: 'ASK_OFFLINE_QUESTION',
          suspectId: suspect.id,
          questionId: q.id,
          tone: 'neutral',
        });
        expect(player(next).history.at(-1)?.answer).toBe(
          known ? q.afterBreak.answer : q.answer,
        );
        expect(next.action?.used).toBe(1);
      }
    }
});

const unlock = (s: GameState, code = '1408') =>
  run(s, {
    type: 'OPEN_LOCK',
    locationId: 'l-office',
    hotspotId: 'h-safe',
    code,
  });
const takeSafe = (s: GameState, clueId = 'c-ledger') =>
  run(s, { type: 'TAKE_CONTAINER_ITEM', hotspotId: 'h-safe', clueId });
const signature = (s: GameState) =>
  run(s, { type: 'INSPECT_CLUE', clueId: 'c-ledger', x: 0.7, y: 0.75 });
it('ручной код: ошибка бесплатна, факты не нужны, один расход, предметы и детали отдельно и личные', () => {
  let s = active(2);
  expect(takeSafe(s)).toBe(s);
  s = unlock(s, '0000');
  expect(s.action).toBeNull();
  expect(player(s).openedLocks).toEqual([]);
  expect(player(s).clues).toEqual([]);
  s = unlock(s);
  expect(s.action?.used).toBe(1);
  expect(player(s).facts).toEqual([]);
  expect(player(s).openedLocks).toEqual(['h-safe']);
  expect(player(s).clues).toEqual([]);
  expect(unlock(s)).toBe(s);
  expect(takeSafe(s, 'c-statuette')).toBe(s);
  for (const id of ['c-ledger', 'c-envelope', 'c-will', 'c-lawyer-card'])
    s = takeSafe(s, id);
  expect(s.action?.used).toBe(1);
  expect(player(s).clues).toHaveLength(4);
  expect(player(s).facts).not.toContain('f-ledger-signature');
  s = signature(s);
  expect(player(s).facts).toContain('f-ledger-signature');
  expect(s.action?.used).toBe(1);
  expect(s.players[1]?.openedLocks).toEqual([]);
  expect(s.players[1]?.clues).toEqual([]);
  expect(
    takeSafe({ ...s, phase: 'final', finalMode: true }, 'c-envelope'),
  ).toEqual({ ...s, phase: 'final', finalMode: true });
});
it('подпись обязательна для денежного слома Глеба даже при достаточном стрессе', () => {
  let s = takeSafe(unlock(active()));
  s = run(s, { type: 'END_TURN' });
  player(s).stress['s-gleb'] = 6;
  s = present(s, 'c-ledger');
  expect(player(s).truths).not.toContain('t-money');
  s = signature(s);
  s = present(s, 'c-ledger');
  expect(player(s).truths).toContain('t-money');
  expect(player(s).facts).toContain('f-gleb-took-money');
});
it('миграция v2 сохраняет сейф, факты, доску, записки и старую раскрытую денежную тему', () => {
  const old = active();
  const p = player(old);
  p.visited.push('h-safe');
  p.clues.push('c-ledger', 'c-photo');
  p.facts.push('f-safe-code', 'f-double-books');
  p.truths.push('t-money');
  p.notes = 'Моя заметка';
  old.board.push({ id: 'f-safe-code', by: 0 });
  const migrated = parseStoredGame({ version: 2, state: old });
  expect(migrated?.players[0]?.openedLocks).toContain('h-safe');
  expect(migrated?.players[0]?.facts).toEqual(
    expect.arrayContaining([
      'f-safe-hint',
      'f-opening-date',
      'f-ledger-signature',
    ]),
  );
  expect(migrated?.players[0]?.inspectedDetails).toContain(
    'd-ledger-signature',
  );
  expect(migrated?.players[0]?.notes).toBe('Моя заметка');
  expect(migrated?.board[0]?.id).toBe('f-safe-hint');
});

it('старая бухгалтерия сохраняет известную подпись, новая не раскрывает её при загрузке', () => {
  const old = takeSafe(unlock(active()));
  expect(
    parseStoredGame({ version: 2, state: old })?.players[0]?.facts,
  ).toContain('f-ledger-signature');
  expect(
    parseStoredGame({ version: 3, state: old })?.players[0]?.facts,
  ).not.toContain('f-ledger-signature');
});

it('трёхзначный замок принимает только точный код, ошибку не оплачивает', () => {
  const three = structuredClone(c);
  const lock = three.locations
    .flatMap((l) => l.hotspots)
    .find((h) => h.lock)?.lock;
  if (!lock) throw new Error('Missing lock');
  lock.digits = 3;
  lock.code = '214';
  const apply = (s: GameState | null, a: Action) => {
    const next = reduce(three, s, a);
    if (!next) throw new Error('Missing state');
    return next;
  };
  let s = apply(null, { type: 'START_GAME', names: ['А'], roundLimit: 8 });
  s = apply(s, { type: 'BEGIN_TURN' });
  for (const code of ['000', '0214', '21', '1408']) {
    s = apply(s, {
      type: 'OPEN_LOCK',
      locationId: 'l-office',
      hotspotId: 'h-safe',
      code,
    });
    expect(s.action).toBeNull();
    expect(player(s).openedLocks).toEqual([]);
  }
  s = apply(s, {
    type: 'OPEN_LOCK',
    locationId: 'l-office',
    hotspotId: 'h-safe',
    code: '214',
  });
  expect(s.action?.used).toBe(1);
  expect(player(s).openedLocks).toEqual(['h-safe']);
  expect(
    c.locations.flatMap((l) => l.hotspots).find((h) => h.lock)?.lock?.digits,
  ).toBe(4);
});

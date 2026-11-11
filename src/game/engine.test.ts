/** Правила проверяются действиями движка, без UI, сети и LLM. */
import { MockAiClient } from '../ai/client';
import { describe, it, expect } from 'vitest';
import { pilot as c } from '../content/loader';
import { reduce, type GameState, type Action } from './engine';
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
    for (const names of [[], [''], Array(5).fill('X'), ['x'.repeat(31)]])
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
  it('обыск: сейф, выдача фактов, повтор, чужая локация и лимит 2', () => {
    let s = active();
    expect(search(s, 'missing')).toEqual(s);
    s = search(s, 'h-safe');
    expect(s.action).toBeNull();
    expect(s.message).toContain('Код');
    s = search(s, 'h-desk');
    expect(player(s).facts).toContain('f-safe-code');
    expect(search(s, 'h-desk')).toEqual(s);
    expect(search(s, 'h-photos', 'l-hall')).toEqual(s);
    s = search(s, 'h-safe');
    expect(player(s).score).toBe(4);
    expect(search(s, 'h-floor')).toEqual(s);
    expect(ask(s)).toEqual(s);
  });
  it('осмотр без улики; независимость блокнотов, пропуск выбывших, номер раунда', () => {
    let s = search(active(2), 'h-door', 'l-alley');
    expect(player(s).facts).toContain('f-door-key');
    s = run(s, { type: 'END_TURN' });
    expect(s.current).toBe(1);
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

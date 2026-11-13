/** Миграция не меняет прогресс и не применяет историю пилота к другому делу. */
import { expect, it } from 'vitest';
import mini from '../../tests/fixtures/cases/case-e2e-mini/case.json';
import { loadCase, createCaseRegistry, legacyCaseId } from '../content/loader';
import { reduce, type GameState } from '../game/engine';
import { parseStoredGame } from './save';
const initial = () => {
  const state = reduce(loadCase(legacyCaseId), null, {
    type: 'START_GAME',
    names: ['А', 'Б'],
    roundLimit: 8,
  });
  if (!state) throw new Error('Missing state');
  return state;
};
const player = (state: GameState) => {
  const p = state.players[0];
  if (!p) throw new Error('Missing player');
  return p;
};
const withoutCaseId = (state: GameState) => {
  const old: Partial<GameState> = structuredClone(state);
  delete old.caseId;
  return old;
};
it.each([1, 2, 3])(
  'старая партия v%i без caseId получает пилот без потерь',
  (version) => {
    const state = initial();
    player(state).notes = 'Моя версия';
    player(state).score = 7;
    player(state).truths = ['t-money'];
    player(state).history = [
      { suspect: 's-gleb', question: 'Вопрос', answer: 'Ответ' },
    ];
    const old = withoutCaseId(state);
    expect(parseStoredGame({ version, state: old })).toEqual(state);
  },
);
it('v4 сохраняет второе дело, прогресс и совпадающие id без миграции пилота', () => {
  const registry = createCaseRegistry({
    [`/cases/${mini.id}/case.json`]: mini,
  });
  const state = initial();
  state.caseId = mini.id;
  player(state).clues = ['c-photo', 'c-ledger'];
  player(state).facts = ['f-safe-code'];
  player(state).notes = 'Другое дело';
  expect(parseStoredGame({ version: 4, state }, registry.load)).toEqual(state);
});
it('неизвестное дело, версия и отсутствие id в v4 не перезаписываются', () => {
  const state = initial();
  state.caseId = 'missing';
  const raw = { version: 4, state };
  const before = structuredClone(raw);
  expect(() => parseStoredGame(raw)).toThrow();
  expect(raw).toEqual(before);
  expect(() => parseStoredGame({ version: 5, state })).toThrow();
  const old = withoutCaseId(state);
  expect(() => parseStoredGame({ version: 4, state: old })).toThrow(
    'Missing caseId',
  );
});

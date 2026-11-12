/** Zustand объединяет чистый движок и последовательное сохранение до подтверждения действия. */
import { create } from 'zustand';
import { pilot } from '../content/loader';
import { reduce, type GameState, type Action } from '../game/engine';
import { loadGame, saveGame, clearGame } from '../persistence/save';
import { ru } from '../i18n/ru';
type Store = {
  game: GameState | null;
  ready: boolean;
  busy: boolean;
  error: string;
  init: () => Promise<void>;
  dispatch: (a: Action) => Promise<void>;
  reset: () => Promise<void>;
};
let initializing: Promise<void> | undefined;
export const useGame = create<Store>((set, get) => ({
  game: null,
  ready: false,
  busy: false,
  error: '',
  init: () =>
    (initializing ??= (async () => {
      try {
        const game = await loadGame();
        set({
          game: game ? reduce(pilot, game, { type: 'LOCK' }) : null,
          ready: true,
        });
      } catch {
        set({ ready: true, error: ru.game.saveError });
      }
    })()),
  dispatch: async (a) => {
    if (get().busy) return;
    set({ busy: true, error: '' });
    try {
      const game = reduce(pilot, get().game, a);
      if (game) await saveGame(game);
      set({ game, busy: false });
    } catch {
      set({ busy: false, error: ru.game.saveError });
    }
  },
  reset: async () => {
    try {
      await clearGame();
      set({ game: null, error: '' });
    } catch {
      set({ error: ru.game.saveError });
    }
  },
}));

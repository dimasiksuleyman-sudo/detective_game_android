/** Стор содержит только статус ключа и несекретные настройки; сам ключ — в платформенном хранилище. */
import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { DEFAULT_MODEL, MODELS, type ModelId } from '../ai/config';
import {
  readApiKey,
  storeApiKey,
  removeApiKey,
} from '../platform/secureStorage';
import { getAiClient } from '../ai/factory';
import { ru } from '../i18n/ru';
type Settings = {
  ready: boolean;
  hasKey: boolean;
  busy: boolean;
  model: ModelId;
  fallback: boolean;
  balance: number | null;
  error: string;
  init: () => Promise<void>;
  verify: (key: string) => Promise<boolean>;
  remove: () => Promise<void>;
  refresh: () => Promise<void>;
  configure: (model: ModelId, fallback: boolean) => Promise<void>;
  setBalance: (balance: number) => void;
};
let initPromise: Promise<void> | undefined;
export const useSettings = create<Settings>((update, getState) => ({
  ready: false,
  hasKey: false,
  busy: false,
  model: DEFAULT_MODEL,
  fallback: false,
  balance: null,
  error: '',
  init: () =>
    (initPromise ??= (async () => {
      try {
        const raw: unknown = await get('interrogation-ai-preferences');
        const prefs = typeof raw === 'object' && raw !== null ? raw : {};
        const model =
          'model' in prefs
            ? MODELS.find((m) => m.id === prefs.model)?.id
            : undefined;
        const fallback = 'fallback' in prefs && prefs.fallback === true;
        const key = await readApiKey();
        update({
          ready: true,
          hasKey: !!key,
          model: model ?? DEFAULT_MODEL,
          fallback,
        });
      } catch {
        update({ ready: true, error: ru.ai.storageError });
      }
    })()),
  verify: async (key) => {
    if (getState().busy) return false;
    update({ busy: true, error: '' });
    try {
      const trimmed = key.trim();
      if (!trimmed || trimmed.length > 512) throw Error('invalid');
      const result = await getAiClient().checkKey(
        trimmed,
        new AbortController().signal,
      );
      await storeApiKey(trimmed);
      update({ hasKey: true, busy: false, balance: result.balance });
      return true;
    } catch {
      update({ busy: false, error: ru.ai.keyError });
      return false;
    }
  },
  refresh: async () => {
    if (getState().busy) return;
    update({ busy: true, error: '' });
    try {
      const key = await readApiKey();
      if (!key) throw Error('missing');
      const result = await getAiClient().checkKey(
        key,
        new AbortController().signal,
      );
      update({ balance: result.balance, busy: false });
    } catch {
      update({ busy: false, error: ru.ai.keyError });
    }
  },
  remove: async () => {
    update({ busy: true, error: '' });
    try {
      await removeApiKey();
      update({ hasKey: false, busy: false, balance: null });
    } catch {
      update({ busy: false, error: ru.ai.storageError });
    }
  },
  configure: async (model, fallback) => {
    if (!MODELS.some((m) => m.id === model)) return;
    try {
      await set('interrogation-ai-preferences', { model, fallback });
      update({ model, fallback, error: '' });
    } catch {
      update({ error: ru.ai.storageError });
    }
  },
  setBalance: (balance) => update({ balance }),
}));

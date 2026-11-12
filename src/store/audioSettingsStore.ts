/** Несекретные настройки музыки/эффектов/дождя с немедленным применением и сохранением. */
import { ru } from '../i18n/ru';
import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import {
  defaultAudioPreferences,
  type AudioPreferences,
} from '../audio/policy';
type State = AudioPreferences & {
  ready: boolean;
  error: string;
  init: () => Promise<void>;
  configure: (patch: Partial<AudioPreferences>) => void;
};
let initializing: Promise<void> | undefined;
let writes = Promise.resolve();
let revision = 0;
export const useAudioSettings = create<State>((update, getState) => ({
  ...defaultAudioPreferences,
  ready: false,
  error: '',
  init: () =>
    (initializing ??= (async () => {
      const started = revision;
      try {
        const raw: unknown = await get('interrogation-audio-preferences');
        if (started === revision && raw && typeof raw === 'object') {
          const value = raw as Partial<AudioPreferences>;
          update({
            music: typeof value.music === 'boolean' ? value.music : true,
            effects: typeof value.effects === 'boolean' ? value.effects : true,
            rain: value.rain === true,
            musicVolume:
              typeof value.musicVolume === 'number' &&
              Number.isFinite(value.musicVolume)
                ? Math.max(0, Math.min(1, value.musicVolume))
                : 0.4,
          });
        }
      } finally {
        update({ ready: true });
      }
    })().catch(() => {
      update({ ready: true });
    })),
  configure: (patch) => {
    revision++;
    const volume = patch.musicVolume;
    update({
      error: '',
      ...patch,
      ...(volume === undefined
        ? {}
        : {
            musicVolume: Number.isFinite(volume)
              ? Math.max(0, Math.min(1, volume))
              : 0.4,
          }),
    });
    const { music, musicVolume, effects, rain } = getState();
    writes = writes
      .catch(() => {})
      .then(() =>
        set('interrogation-audio-preferences', {
          music,
          musicVolume,
          effects,
          rain,
        }),
      )
      .catch(() => update({ error: ru.sound.saveError }));
  },
}));

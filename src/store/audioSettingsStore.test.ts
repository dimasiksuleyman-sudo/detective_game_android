import { expect, it, vi } from 'vitest';
const disk = vi.hoisted(() => ({
  get: vi.fn(async () => ({
    music: false,
    musicVolume: 0.65,
    effects: false,
    rain: true,
  })),
  set: vi.fn(async () => {}),
}));
vi.mock('idb-keyval', () => disk);
import { useAudioSettings } from './audioSettingsStore';
it('настройки загружаются и меняются немедленно, сохраняются отдельно от ключа с ограничением громкости', async () => {
  expect(useAudioSettings.getState().musicVolume).toBe(0.4);
  await useAudioSettings.getState().init();
  expect(useAudioSettings.getState()).toMatchObject({
    ready: true,
    music: false,
    musicVolume: 0.65,
    effects: false,
    rain: true,
  });
  useAudioSettings
    .getState()
    .configure({ music: true, musicVolume: 9, rain: false });
  expect(useAudioSettings.getState()).toMatchObject({
    music: true,
    musicVolume: 1,
    rain: false,
  });
  await vi.waitFor(() =>
    expect(disk.set).toHaveBeenCalledWith('interrogation-audio-preferences', {
      music: true,
      musicVolume: 1,
      effects: false,
      rain: false,
    }),
  );
});

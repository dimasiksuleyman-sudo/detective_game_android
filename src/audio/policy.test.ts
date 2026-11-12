import { expect, it } from 'vitest';
import manifest from '../../public/audio/manifest.json';
import { defaultAudioPreferences, musicLevel, selectMusic } from './policy';
it('готовые роли выбираются по экранам, передача едина, отсутствующий трек использует fallback', () => {
  expect(selectMusic('s06')?.id).toBe('music-menu');
  for (const track of manifest.music)
    for (const screen of track.screens) {
      if (screen === 's06') continue;
      expect(selectMusic(screen, track.id === 'music-solved')?.id).toBe(
        track.id,
      );
    }
  for (const track of manifest.planned)
    for (const screen of track.screens) {
      if (!manifest.music.some((t) => t.id === track.id))
        expect(selectMusic(screen, track.id === 'music-solved')?.id).toBe(
          'music-menu',
        );
    }
});
it('громкость по умолчанию 40%, ducking 25%, выключение музыки независимо от эффектов', () => {
  expect(defaultAudioPreferences).toEqual({
    music: true,
    musicVolume: 0.4,
    effects: true,
    rain: false,
  });
  expect(musicLevel(defaultAudioPreferences, false)).toBe(0.4);
  expect(musicLevel(defaultAudioPreferences, true)).toBe(0.1);
  expect(musicLevel({ ...defaultAudioPreferences, music: false }, true)).toBe(
    0,
  );
});

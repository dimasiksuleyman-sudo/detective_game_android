import { expect, it } from 'vitest';
import { defaultAudioPreferences, musicLevel, selectMusic } from './policy';
it('музыка экрана выбирает готовый fallback, передача едина, финал без трека безопасен', () => {
  for (const screen of [
    's02',
    's03',
    's05',
    's06',
    's07',
    's08',
    's09',
    's10',
    's11',
    's12',
    's13',
    's14',
    's15',
    's16',
  ])
    expect(selectMusic(screen)?.id).toBe('music-menu');
  expect(selectMusic('s14', true)?.id).toBe('music-menu');
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

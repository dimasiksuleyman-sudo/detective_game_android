/** Проверка локальных медиа без сети и платных генераторов. */
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import manifest from '../../public/audio/manifest.json';
it('каждый готовый трек/эффект существует как MP3, пути локальные и уникальные', () => {
  const entries = [...manifest.music, ...manifest.sfx];
  expect(manifest.music.length).toBeGreaterThanOrEqual(1);
  expect(manifest.sfx.map((e) => e.id)).toEqual(
    expect.arrayContaining([
      'ui-tap',
      'new-fact',
      'handover',
      'hold-confirm',
      'error',
      'rain-loop',
      'sting-break',
      'paper',
    ]),
  );
  expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  for (const entry of entries) {
    expect(entry.file).toMatch(/^(music|sfx)\/[a-z0-9-]+\.mp3$/);
    const bytes = readFileSync('public/audio/' + entry.file);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 255).toBe(
      true,
    );
  }
});

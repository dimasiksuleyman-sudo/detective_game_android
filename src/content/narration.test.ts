import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../../public/cases/case-001-blue-owl/audio/manifest.json';
/** Содержимое записей не подменяет изменившийся текст и не озвучивает неоткрытые подсказки. */
import { expect, it } from 'vitest';
import { briefingText, narrationFor, hintNarration } from './narration';
import { pilot } from './loader';
it('устаревший текст/неизвестная подсказка не получают дорожку', () => {
  expect(narrationFor('briefing', briefingText)?.src).toContain('briefing.mp3');
  expect(narrationFor('briefing', 'Другой брифинг')).toBeUndefined();
  expect(hintNarration('')).toBeUndefined();
  expect(hintNarration(pilot.hints[0]?.text ?? '')?.id).toBe('chief-hint-1');
  expect(briefingText).not.toContain('восемь раундов');
});

it('восемь встроенных MP3 соответствуют манифесту по размеру и хешу', () => {
  expect(manifest.clips).toHaveLength(8);
  expect(new Set(manifest.clips.map((c) => c.id)).size).toBe(8);
  for (const clip of manifest.clips) {
    expect(clip.file).toMatch(/^[a-z0-9-]+\.mp3$/);
    const audio = readFileSync(
      'public/cases/' + manifest.caseId + '/audio/' + clip.file,
    );
    expect(audio.length).toBe(clip.bytes);
    expect(createHash('sha256').update(audio).digest('hex')).toBe(clip.sha256);
    expect(clip.seconds).toBeGreaterThan(0);
  }
});

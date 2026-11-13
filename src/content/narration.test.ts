import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../../public/cases/case-001-blue-owl/audio/manifest.json';
/** Содержимое записей не подменяет изменившийся текст и не озвучивает неоткрытые подсказки. */
import { expect, it } from 'vitest';
import {
  briefingText as getBriefingText,
  narrationFor,
  hintNarration,
} from './narration';
import { loadCase } from './loader';
const pilot = loadCase('case-001-blue-owl');
const briefingText = getBriefingText(pilot);
it('устаревший текст/неизвестная подсказка не получают дорожку', () => {
  expect(narrationFor(pilot.id, 'briefing', briefingText)?.src).toContain(
    'briefing.mp3',
  );
  expect(narrationFor(pilot.id, 'briefing', 'Другой брифинг')).toBeUndefined();
  expect(hintNarration(pilot.id, '')).toBeUndefined();
  expect(hintNarration(pilot.id, pilot.hints[0]?.text ?? '')?.id).toBe(
    'chief-hint-1',
  );
  expect(briefingText).not.toContain('восемь раундов');
});

it('встроенные MP3 соответствуют манифесту по размеру и хешу', () => {
  // Брифинг, 4 подсказки Шефа, 3 подписи реконструкции, объяснение (ADR-026).
  expect(manifest.clips).toHaveLength(9);
  expect(new Set(manifest.clips.map((c) => c.id)).size).toBe(9);
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

it('тексты всех записей совпадают с текущим каноном игры', () => {
  expect(narrationFor(pilot.id, 'briefing', briefingText)).toBeDefined();
  for (const clip of manifest.clips.filter((c) => c.role === 'chief'))
    expect(pilot.hints.some((h) => h.text === clip.text)).toBe(true);
  // Каждая подсказка Шефа, включая подсказку про сейф, озвучена.
  for (const hint of pilot.hints)
    expect(hintNarration(pilot.id, hint.text)).toBeDefined();
  expect(
    narrationFor(pilot.id, 'solution-explanation', pilot.solution.explanation),
  ).toBeDefined();
  pilot.solution.reconstruction.forEach((r, i) =>
    expect(
      narrationFor(pilot.id, 'reconstruction-' + (i + 1), r.caption),
    ).toBeDefined(),
  );
});

it('план будущей озвучки сохраняет источники прежних подсказок и включает новую без цифр в речи', () => {
  const plan = JSON.parse(
    readFileSync('content/narration/plan.json', 'utf8'),
  ) as { clips: { id: string; role: string; source: (string | number)[] }[] };
  const config = JSON.parse(
    readFileSync('content/narration/elevenlabs.json', 'utf8'),
  ) as { speech: Record<string, { text: string; say: string }> };
  const hints = plan.clips.filter((clip) => clip.role === 'chief');
  expect(hints).toHaveLength(pilot.hints.length);
  for (const clip of hints) {
    const speech = config.speech[clip.id];
    const source = pilot.hints[Number(clip.source[1])];
    expect(speech?.text).toBe(source?.text);
    expect(speech?.say).not.toMatch(/\d/);
    const recorded = manifest.clips.find((item) => item.id === clip.id);
    if (recorded) expect(speech?.text).toBe(recorded.text);
  }
});

it('другое дело не получает дорожки пилота даже с тем же id и текстом', () => {
  expect(
    narrationFor('case-e2e-mini', 'briefing', briefingText),
  ).toBeUndefined();
  expect(
    hintNarration('case-e2e-mini', pilot.hints[0]?.text ?? ''),
  ).toBeUndefined();
});

/** Запись доступна только при совпадении её текста с текущим содержимым дела. Спойлеры ограничивает экран игры. */
import manifest from '../../public/cases/case-001-blue-owl/audio/manifest.json';
import { pilot } from './loader';
export interface NarrationClip {
  id: string;
  src: string;
}
export const briefingText = pilot.briefing.replace(
  'Шеф дал вам восемь раундов. ',
  '',
);
export function narrationFor(
  id: string,
  text: string,
): NarrationClip | undefined {
  const clip = manifest.clips.find((c) => c.id === id && c.text === text);
  return clip
    ? { id: clip.id, src: `/cases/${manifest.caseId}/audio/${clip.file}` }
    : undefined;
}
export function hintNarration(text: string): NarrationClip | undefined {
  const clip = manifest.clips.find(
    (c) => c.role === 'chief' && c.text === text,
  );
  return clip ? narrationFor(clip.id, text) : undefined;
}

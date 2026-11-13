/** Дорожки выбираются только из манифеста активного дела и при совпадении текста. */
import { z } from 'zod';
import type { CaseFile } from './schema';
const schema = z.object({
  caseId: z.string(),
  clips: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      text: z.string(),
      file: z.string().regex(/^[a-z0-9-]+\.mp3$/),
    }),
  ),
});
const manifests = new Map(
  Object.entries(
    import.meta.glob('../../public/cases/*/audio/manifest.json', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, raw]) => {
    const manifest = schema.parse(raw);
    if (!path.endsWith(`/${manifest.caseId}/audio/manifest.json`))
      throw new Error('Narration case mismatch');
    return [manifest.caseId, manifest];
  }),
);
export interface NarrationClip {
  id: string;
  src: string;
}
export const briefingText = (c: CaseFile) =>
  c.briefing.replace('Шеф дал вам восемь раундов. ', '');
export function narrationFor(
  caseId: string,
  id: string,
  text: string,
): NarrationClip | undefined {
  const clip = manifests
    .get(caseId)
    ?.clips.find((c) => c.id === id && c.text === text);
  return clip
    ? { id: clip.id, src: `/cases/${caseId}/audio/${clip.file}` }
    : undefined;
}
export function hintNarration(
  caseId: string,
  text: string,
): NarrationClip | undefined {
  const clip = manifests
    .get(caseId)
    ?.clips.find((c) => c.role === 'chief' && c.text === text);
  return clip ? narrationFor(caseId, clip.id, text) : undefined;
}

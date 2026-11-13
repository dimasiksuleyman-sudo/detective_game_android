/** Размеры и готовность иллюстраций по манифестам всех дел; труппа общая. */
import { z } from 'zod';
const schema = z.object({
  caseId: z.string(),
  files: z.array(
    z.object({ output: z.string(), width: z.number(), height: z.number() }),
  ),
});
const manifests = Object.values(
  import.meta.glob('../../art/*/manifest.json', {
    eager: true,
    import: 'default',
  }),
).map((raw) => schema.parse(raw));
export const illustrationDimensions = (caseId: string, src: string) => {
  const path = src.replace(/^\//, '');
  return manifests
    .filter((m) => path.startsWith('troupe/') || m.caseId === caseId)
    .flatMap((m) => m.files)
    .find((file) => file.output === path);
};
export const isFinishedIllustration = (caseId: string, src: string) =>
  !!illustrationDimensions(caseId, src);

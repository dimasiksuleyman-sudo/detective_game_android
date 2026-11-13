/** CLI: формат, ссылки, достижимость и физические ресурсы встроенного дела. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { caseSchema } from '../src/content/schema';
import { validateCase } from '../src/content/validate';
import art from '../art/pilot/manifest.json';
const file = process.argv[2] ?? 'public/cases/case-001-blue-owl/case.json';
const c = caseSchema.parse(JSON.parse(await readFile(file, 'utf8'))),
  report = validateCase(c);
const assets = [
  { file: c.cover, w: 720, h: 1080 },
  ...c.locations.map((l) => ({ file: l.image, w: 1080, h: 1620 })),
  ...c.locations.flatMap((l) =>
    l.hotspots
      .filter((h) => h.closeup)
      .map((h) => ({ file: h.closeup ?? '', w: 1024, h: 1024 })),
  ),
  ...c.locations.flatMap((l) =>
    l.hotspots.flatMap((h) =>
      h.container ? [{ file: h.container.image, w: 1024, h: 1024 }] : [],
    ),
  ),
  ...c.clues
    .filter((cl) => cl.image)
    .map((cl) => ({ file: cl.image ?? '', w: 512, h: 512 })),
  ...c.clues
    .filter((cl) => cl.inspection)
    .map((cl) => ({ file: cl.inspection?.image ?? '', w: 1024, h: 1024 })),
  ...c.solution.reconstruction.map((r) => ({ file: r.image, w: 1200, h: 800 })),
];
for (const a of assets) {
  const m = await sharp(path.join(path.dirname(file), a.file)).metadata();
  if (m.format !== 'webp' || m.width !== a.w || m.height !== a.h)
    report.errors.push('image format/size ' + a.file);
  if (a.file.startsWith('images/clues/')) {
    const stats = await sharp(path.join(path.dirname(file), a.file)).stats();
    if (!m.hasAlpha || stats.channels[3]?.min !== 0)
      report.errors.push('image transparency ' + a.file);
  }
}
// Шеф не входит в список подозреваемых, но его эмоции тоже поставляются с игрой.
const actorIds = new Set([
  c.victim.actorId,
  ...c.suspects.map((a) => a.actorId),
]);
if (c.id === art.caseId)
  for (const f of art.files)
    if (f.output.startsWith('troupe/')) {
      const actorId = f.output.split('/')[1];
      if (actorId) actorIds.add(actorId);
    }
for (const actorId of actorIds)
  for (const emotion of [
    'neutral',
    'nervous',
    'angry',
    'sad',
    'smug',
    'broken',
  ]) {
    const m = await sharp(
      `public/troupe/${actorId}/${emotion}.webp`,
    ).metadata();
    if (m.width !== 768 || m.height !== 1152 || m.format !== 'webp')
      report.errors.push('actor image ' + actorId + '/' + emotion);
  }
console.log(
  report.errors.length
    ? report.errors
    : '✅ Формат, ссылки, решение, достижимость, алиби, ложные следы, безопасность и ресурсы',
);
console.log(report.graph.join('\n'));
if (report.errors.length) process.exitCode = 1;

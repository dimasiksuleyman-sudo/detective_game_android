/** CLI: формат, ссылки, достижимость и физические ресурсы встроенного дела. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { caseSchema } from '../src/content/schema';
import { validateCase } from '../src/content/validate';
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
  ...c.clues
    .filter((cl) => cl.image)
    .map((cl) => ({ file: cl.image ?? '', w: 512, h: 512 })),
  ...c.solution.reconstruction.map((r) => ({ file: r.image, w: 1200, h: 800 })),
];
for (const a of assets) {
  const m = await sharp(path.join(path.dirname(file), a.file)).metadata();
  if (m.format !== 'webp' || m.width !== a.w || m.height !== a.h)
    report.errors.push('image format/size ' + a.file);
}
for (const a of [c.victim, ...c.suspects])
  for (const emotion of [
    'neutral',
    'nervous',
    'angry',
    'sad',
    'smug',
    'broken',
  ]) {
    const m = await sharp(
      `public/troupe/${a.actorId}/${emotion}.webp`,
    ).metadata();
    if (m.width !== 768 || m.height !== 1152 || m.format !== 'webp')
      report.errors.push('actor image ' + a.actorId);
  }
console.log(
  report.errors.length
    ? report.errors
    : '✅ Формат, ссылки, решение, достижимость, алиби, ложные следы, безопасность и ресурсы',
);
console.log(report.graph.join('\n'));
if (report.errors.length) process.exitCode = 1;

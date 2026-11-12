/** M3: готовит WebP из явного списка оригиналов; ZIP/публикация реализуются в M5. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
if (process.argv.slice(2).join(' ') !== '--art-only') {
  throw new Error(
    'Доступна только подготовка арта: npx tsx tools/build-pack.ts --art-only. ZIP ещё не реализован.',
  );
}
const manifest = z
  .object({
    caseId: z.literal('case-001-blue-owl'),
    files: z
      .array(
        z.object({
          source: z.string().regex(/^[a-z0-9-]+\.png$/),
          output: z
            .string()
            .regex(
              /^(?:images\/(?:(?:locations|closeups|clues|reconstruction)\/)?[a-z0-9-]+|troupe\/a[0-9]{2}-[a-z0-9-]+\/(?:neutral|nervous|angry|sad|smug|broken))\.webp$/,
            ),
          width: z.number().int().positive().max(2048),
          height: z.number().int().positive().max(2048),
          sourceWidth: z.number().int().positive().max(4096).default(1024),
          sourceHeight: z.number().int().positive().max(4096).default(1536),
          quality: z.number().int().min(1).max(100).default(80),
        }),
      )
      .min(1),
  })
  .parse(JSON.parse(await readFile('art/pilot/manifest.json', 'utf8')));
if (new Set(manifest.files.map((f) => f.output)).size !== manifest.files.length)
  throw new Error('Повторяющиеся выходные пути');
// Сначала готовим и проверяем весь набор: повреждённый исходник не оставит половину новых ресурсов.
const prepared: { file: (typeof manifest.files)[number]; buffer: Buffer }[] =
  [];
for (const file of manifest.files) {
  const source = path.join('art/pilot', file.source);
  const meta = await sharp(source).metadata();
  if (
    meta.format !== 'png' ||
    meta.width !== file.sourceWidth ||
    meta.height !== file.sourceHeight
  )
    throw new Error(
      'Размер оригинала PNG не совпадает с манифестом: ' + source,
    );
  if (
    Math.abs(
      file.sourceWidth / file.sourceHeight / (file.width / file.height) - 1,
    ) > 0.025
  )
    throw new Error(
      'Не совпадают пропорции оригинала и игрового изображения: ' + source,
    );
  if (file.output.startsWith('images/clues/')) {
    const stats = await sharp(source).stats();
    if (!meta.hasAlpha || stats.channels[3]?.min !== 0)
      throw new Error('У предмета нужен прозрачный фон: ' + source);
  }
  const buffer = await sharp(source)
    .rotate()
    .resize(file.width, file.height, { fit: 'fill' })
    .webp({ quality: file.quality })
    .toBuffer();
  const result = await sharp(buffer).metadata();
  if (
    result.format !== 'webp' ||
    result.width !== file.width ||
    result.height !== file.height
  )
    throw new Error('Неверный результат конвертации: ' + file.output);
  prepared.push({ file, buffer });
}
for (const { file, buffer } of prepared) {
  const output = file.output.startsWith('troupe/')
    ? path.join('public', file.output)
    : path.join('public/cases', manifest.caseId, file.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, buffer);
  console.log(
    `${output}: ${file.width}×${file.height}, ${buffer.length} bytes`,
  );
}

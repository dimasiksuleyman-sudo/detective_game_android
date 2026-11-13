/** Подготовка входов @capacitor/assets; исходные PNG скачиваются из LFS только для регенерации. */
import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('assets', { recursive: true });
for (const [source, target] of [
  ['app-icon', 'icon-only'],
  ['icon-foreground', 'icon-foreground'],
  ['icon-background', 'icon-background'],
  ['splash', 'splash'],
  ['splash-dark', 'splash-dark'],
])
  await copyFile(`art/app/${source}.png`, `assets/${target}.png`);

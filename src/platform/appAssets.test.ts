/** Проверка реально упаковываемых ресурсов без скачивания LFS-исходников в CI. */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import config from '../../capacitor.config';
const res = 'android/app/src/main/res';
/** Множитель плотности Android: px = dp × scale. */
const densities = {
  ldpi: 0.75,
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};
it('все плотности в точном размере: обычная иконка 48dp, слои adaptive 108dp; есть monochrome', async () => {
  for (const [density, scale] of Object.entries(densities))
    for (const [name, dp] of [
      ['ic_launcher', 48],
      ['ic_launcher_round', 48],
      // Слой меньше 108dp Android растягивает, и иконка на рабочем столе мылится.
      ['ic_launcher_foreground', 108],
      ['ic_launcher_background', 108],
      ['ic_launcher_monochrome', 108],
    ] as const) {
      const meta = await sharp(
        `${res}/mipmap-${density}/${name}.png`,
      ).metadata();
      expect(`${density}/${name} ${meta.width}×${meta.height}`).toBe(
        `${density}/${name} ${dp * scale}×${dp * scale}`,
      );
    }
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const xml = readFileSync(`${res}/mipmap-anydpi-v26/${name}.xml`, 'utf8');
    expect(xml).toContain('<adaptive-icon');
    expect(xml).toContain(
      '<monochrome android:drawable="@mipmap/ic_launcher_monochrome"',
    );
  }
});
it('передний слой целиком в безопасном круге 66/108; monochrome — белый alpha-силуэт', async () => {
  const { data, info } = await sharp(
    `${res}/drawable-nodpi/app_launch_icon.png`,
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let radius = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) > 8)
        radius = Math.max(
          radius,
          Math.hypot(x - info.width / 2, y - info.height / 2),
        );
  expect(radius).toBeGreaterThan(100);
  expect(radius).toBeLessThanOrEqual((info.width * 33) / 108);
  const mono = await sharp(`${res}/mipmap-xxxhdpi/ic_launcher_monochrome.png`)
    .ensureAlpha()
    .raw()
    .toBuffer();
  let white = 255;
  for (let i = 0; i < mono.length; i += 4)
    if ((mono[i + 3] ?? 0) > 200)
      for (let c = 0; c < 3; c++) white = Math.min(white, mono[i + c] ?? 0);
  expect(white).toBeGreaterThanOrEqual(254);
});
it('системный сплэш тёмный, без автоматической задержки; legacy PNG тоже тёмный', async () => {
  expect(config.plugins?.SplashScreen?.launchAutoHide).toBe(false);
  expect(config.plugins?.SplashScreen?.launchFadeOutDuration).toBe(0);
  const xml = readFileSync(`${res}/values-v31/styles.xml`, 'utf8');
  expect(xml).toContain('android:windowSplashScreenAnimatedIcon');
  expect(xml).toContain('#12181D');
  const { data } = await sharp(`${res}/drawable/splash.png`)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([...data.subarray(0, 3)]).toEqual([18, 24, 29]);
});

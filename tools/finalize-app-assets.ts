/** Дополнение генератора: слои adaptive-icon в 108dp, monochrome и XML, без ручной правки плотностей. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
const root = 'android/app/src/main/res';
/**
 * Слои adaptive-icon — 108dp, а не 48dp, как у обычной иконки. Генератор кладёт их
 * в размере 48dp, и Android растягивает картинку в 2,25 раза (мыльная иконка).
 * Поэтому все три слоя нарезаем заново из исходников 1024² в точном размере 108dp.
 */
const ADAPTIVE_LAYER_PX: Record<string, number> = {
  ldpi: 81,
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};
for (const [density, size] of Object.entries(ADAPTIVE_LAYER_PX))
  for (const [source, target] of [
    ['icon-foreground', 'ic_launcher_foreground'],
    ['icon-background', 'ic_launcher_background'],
    ['icon-monochrome', 'ic_launcher_monochrome'],
  ])
    await sharp(`art/app/${source}.png`)
      .resize(size, size, { kernel: 'lanczos3' })
      .png({ compressionLevel: 9 })
      .toFile(`${root}/mipmap-${density}/${target}.png`);
const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
for (const name of ['ic_launcher', 'ic_launcher_round'])
  await writeFile(`${root}/mipmap-anydpi-v26/${name}.xml`, xml);
await mkdir(`${root}/drawable-nodpi`, { recursive: true });
await copyFile(
  'assets/icon-foreground.png',
  `${root}/drawable-nodpi/app_launch_icon.png`,
);
// Тема остаётся отдельной от генерируемых PNG и одинаково тёмной в обеих темах ОС.
const styles = `${root}/values/styles.xml`;
let text = await readFile(styles, 'utf8');
text = text.replace(
  /<style name="AppTheme.NoActionBarLaunch"[\s\S]*?<\/style>/,
  `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowBackground">@drawable/splash</item>
        <item name="windowSplashScreenBackground">#12181D</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/app_launch_icon</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`,
);
await writeFile(styles, text);
await mkdir(`${root}/values-v31`, { recursive: true });
await writeFile(
  `${root}/values-v31/styles.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#12181D</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/app_launch_icon</item>
        <item name="android:windowSplashScreenBackground">#12181D</item>
        <item name="android:windowSplashScreenAnimatedIcon">@drawable/app_launch_icon</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
</resources>
`,
);

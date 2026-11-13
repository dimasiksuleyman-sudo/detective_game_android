/** Дополнение генератора: monochrome и XML адаптивных иконок, без ручной правки плотностей. */
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
} from 'node:fs/promises';
import sharp from 'sharp';
const root = 'android/app/src/main/res';
for (const entry of await readdir(root)) {
  if (!/^mipmap-(ldpi|mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)$/.test(entry)) continue;
  const meta = await sharp(
    `${root}/${entry}/ic_launcher_foreground.png`,
  ).metadata();
  await sharp('art/app/icon-monochrome.png')
    .resize(meta.width, meta.height)
    .png()
    .toFile(`${root}/${entry}/ic_launcher_monochrome.png`);
}
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

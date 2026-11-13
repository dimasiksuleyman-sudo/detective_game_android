/** Нативная заставка скрывается после готовности React; веб не обращается к плагину. */
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
let hiding: Promise<void> | undefined;
export function hideLaunchSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  return (hiding ??= SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {
    // Ошибка нативного моста не должна ломать загрузку партии; разрешаем повтор.
    hiding = undefined;
  }));
}

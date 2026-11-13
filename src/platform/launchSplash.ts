/** Нативная заставка скрывается после готовности React; веб не обращается к плагину. */
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Страховка: launchAutoHide выключен, поэтому если загрузка сохранения почему-то
 * не завершится, заставка висела бы вечно. Через это время она скрывается в любом
 * случае — игрок увидит экран загрузки или ошибку, а не застывшую лупу.
 */
export const SPLASH_FALLBACK_MS = 8000;

let hiding: Promise<void> | undefined;
export function hideLaunchSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  return (hiding ??= SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {
    // Ошибка нативного моста не должна ломать загрузку партии; разрешаем повтор.
    hiding = undefined;
  }));
}

/** Вызывается один раз при старте приложения, до первого рендера. */
export function armLaunchSplashFallback(ms = SPLASH_FALLBACK_MS): void {
  if (!Capacitor.isNativePlatform()) return;
  setTimeout(() => void hideLaunchSplash(), ms);
}

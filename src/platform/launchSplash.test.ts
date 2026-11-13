import { expect, it, vi, beforeEach } from 'vitest';
const native = vi.hoisted(() => vi.fn());
const hide = vi.hoisted(() => vi.fn());
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: native } }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide } }));
beforeEach(() => {
  vi.resetModules();
  native.mockReset();
  hide.mockReset();
  hide.mockResolvedValue(undefined);
});
it('веб не обращается к нативной заставке', async () => {
  native.mockReturnValue(false);
  await (await import('./launchSplash')).hideLaunchSplash();
  expect(hide).not.toHaveBeenCalled();
});
it('готовность приложения скрывает заставку один раз без таймера и fade', async () => {
  native.mockReturnValue(true);
  const { hideLaunchSplash } = await import('./launchSplash');
  await Promise.all([hideLaunchSplash(), hideLaunchSplash()]);
  expect(hide).toHaveBeenCalledExactlyOnceWith({ fadeOutDuration: 0 });
});
it('страховочный таймер скрывает заставку, даже если загрузка зависла', async () => {
  vi.useFakeTimers();
  try {
    native.mockReturnValue(true);
    const { armLaunchSplashFallback, SPLASH_FALLBACK_MS } =
      await import('./launchSplash');
    armLaunchSplashFallback();
    await vi.advanceTimersByTimeAsync(SPLASH_FALLBACK_MS - 1);
    expect(hide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(hide).toHaveBeenCalledExactlyOnceWith({ fadeOutDuration: 0 });
  } finally {
    vi.useRealTimers();
  }
});
it('в вебе страховочный таймер не ставится', async () => {
  vi.useFakeTimers();
  try {
    native.mockReturnValue(false);
    const { armLaunchSplashFallback } = await import('./launchSplash');
    armLaunchSplashFallback();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
it('ошибка моста не ломает загрузку и допускает повтор скрытия', async () => {
  native.mockReturnValue(true);
  hide.mockRejectedValueOnce(new Error('bridge'));
  const { hideLaunchSplash } = await import('./launchSplash');
  await expect(hideLaunchSplash()).resolves.toBeUndefined();
  await hideLaunchSplash();
  expect(hide).toHaveBeenCalledTimes(2);
});

import { afterEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({
  listener: undefined as undefined | (() => void),
  remove: vi.fn(),
  exit: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((_name: string, callback: () => void) => {
      native.listener = callback;
      return Promise.resolve({ remove: native.remove });
    }),
    exitApp: native.exit,
  },
}));
import { watchBackButton, exitApp } from './backButton';
afterEach(() => vi.unstubAllGlobals());
it('Android backButton вызывает политику игры; cleanup снимает listener, выход явный', async () => {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('history', { pushState: vi.fn(), state: null });
  vi.stubGlobal('location', { href: 'http://localhost/' });
  const back = vi.fn();
  const stop = watchBackButton(back);
  native.listener?.();
  expect(back).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('popstate'));
  expect(back).toHaveBeenCalledTimes(2);
  stop();
  await Promise.resolve();
  expect(native.remove).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('popstate'));
  expect(back).toHaveBeenCalledTimes(2);
  exitApp();
  expect(native.exit).toHaveBeenCalledTimes(1);
});

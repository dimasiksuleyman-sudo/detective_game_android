/** Проверяет приватность и взаимное исключение дорожек без реального звука/сети. */
import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ callbacks: new Set<() => void>() }));
vi.mock('./appLifecycle', () => ({
  watchLifecycle: (callback: () => void) => {
    state.callbacks.add(callback);
    return () => state.callbacks.delete(callback);
  },
}));
import { bindNarration } from './audio';
class FakeAudio extends EventTarget {
  paused = true;
  currentTime = 0;
  pause() {
    this.paused = true;
  }
  removeAttribute = vi.fn();
  load = vi.fn();
  play() {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }
}
it('новая дорожка останавливает предыдущую; фон и уход очищают воспроизведение', () => {
  const a = new FakeAudio(),
    b = new FakeAudio();
  const disposeA = bindNarration(a as unknown as HTMLAudioElement);
  const disposeB = bindNarration(b as unknown as HTMLAudioElement);
  a.play();
  a.currentTime = 8;
  b.play();
  b.currentTime = 3;
  expect(a.paused).toBe(true);
  expect(a.currentTime).toBe(0);
  expect(b.paused).toBe(false);
  for (const callback of state.callbacks) callback();
  expect(b.paused).toBe(true);
  expect(b.currentTime).toBe(0);
  b.play();
  b.currentTime = 5;
  disposeA();
  disposeB();
  expect(b.paused).toBe(true);
  expect(b.currentTime).toBe(0);
  expect(b.removeAttribute).toHaveBeenCalledWith('src');
  expect(b.load).toHaveBeenCalled();
  expect(state.callbacks.size).toBe(0);
});

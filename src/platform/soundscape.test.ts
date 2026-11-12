/** Проверяет кроссфейд и жизненный цикл без звукового устройства или сети. */
import { afterEach, expect, it, vi } from 'vitest';
const life = vi.hoisted(() => ({ pause: () => {}, resume: () => {} }));
vi.mock('./appLifecycle', () => ({
  watchLifecycle: (pause: () => void, resume: () => void) => {
    life.pause = pause;
    life.resume = resume;
    return () => {};
  },
}));
vi.mock('../../public/audio/manifest.json', () => ({
  default: {
    music: [
      { id: 'music-menu', file: 'menu.mp3', loop: true, screens: ['s02'] },
      {
        id: 'music-investigation',
        file: 'investigation.mp3',
        loop: true,
        screens: ['s07'],
      },
    ],
    planned: [],
    sfx: [],
  },
}));
import { mountSoundscape, setNarrationActive } from './soundscape';
class Audio extends EventTarget {
  dataset: Record<string, string> = {};
  paused = true;
  currentTime = 0;
  volume = 1;
  src = '';
  loop = false;
  preload = '';
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  removeAttribute() {}
  load() {}
}
class Container {
  hidden = false;
  dataset = {};
  children: Audio[] = [];
  append(a: Audio) {
    this.children.push(a);
  }
  remove() {}
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('кроссфейд 1,5 с, ducking обоих каналов, пауза/продолжение и нейтральная передача', () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  const audios: Audio[] = [];
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    body: { append: () => {} },
    createElement: (tag: string) => {
      if (tag === 'audio') {
        const a = new Audio();
        audios.push(a);
        return a;
      }
      return new Container();
    },
  });
  vi.stubGlobal('document', doc);
  const player = mountSoundscape();
  player.screen('s02');
  expect(audios.every((a) => a.paused)).toBe(true);
  doc.dispatchEvent(new Event('pointerdown'));
  vi.advanceTimersByTime(1520);
  const first = audios.find((a) => a.src.endsWith('menu.mp3'));
  expect(first?.volume).toBeCloseTo(0.4);
  player.screen('s07');
  vi.advanceTimersByTime(760);
  const second = audios.find((a) => a.src.endsWith('investigation.mp3'));
  expect(second?.volume).toBeCloseTo(0.2, 1);
  expect(first?.paused).toBe(false);
  setNarrationActive(true);
  expect(first?.volume).toBeLessThanOrEqual(0.1);
  expect(second?.volume).toBeLessThanOrEqual(0.1);
  vi.advanceTimersByTime(760);
  expect(first?.paused).toBe(true);
  expect(second?.volume).toBeCloseTo(0.1);
  if (!second) throw new Error('missing track');
  second.currentTime = 12;
  life.pause();
  expect(audios.every((a) => a.paused)).toBe(true);
  life.resume();
  expect(second.paused).toBe(false);
  expect(second.currentTime).toBe(12);
  player.screen('s06');
  expect(second.paused).toBe(true);
  vi.advanceTimersByTime(1520);
  expect(audios.some((a) => a.src.endsWith('menu.mp3') && !a.paused)).toBe(
    true,
  );
  setNarrationActive(false);
  player.dispose();
  expect(audios.every((a) => a.paused)).toBe(true);
});

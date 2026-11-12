/** Локальные каналы HTMLAudio: музыка с кроссфейдом, дождь, эффекты и ducking. */
import manifest from '../../public/audio/manifest.json';
import {
  defaultAudioPreferences,
  musicLevel,
  selectMusic,
  type AudioPreferences,
} from '../audio/policy';
import { watchLifecycle } from './appLifecycle';
export type EffectId =
  | 'ui-tap'
  | 'new-fact'
  | 'handover'
  | 'hold-confirm'
  | 'error'
  | 'sting-break'
  | 'paper';
type Track = ReturnType<typeof selectMusic>;
let controller: ReturnType<typeof createSoundscape> | undefined;
let narrating = false;
export function setNarrationActive(value: boolean) {
  narrating = value;
  controller?.refreshLevels();
}
export function playEffect(id: EffectId) {
  controller?.effect(id);
}
export function stopEffect(id: EffectId) {
  controller?.stopEffect(id);
}
export function mountSoundscape() {
  const instance = createSoundscape();
  controller = instance;
  return instance;
}
function createSoundscape() {
  let prefs = { ...defaultAudioPreferences };
  let unlocked = false;
  let hidden = document.hidden;
  let disposed = false;
  let screen = 's02',
    solved = false,
    index = 0,
    currentId = '';
  let fade: ReturnType<typeof setInterval> | undefined;
  let sting = false;
  const container = document.createElement('div');
  container.hidden = true;
  container.dataset.soundscape = '';
  document.body.append(container);
  const make = (channel: string, id: string) => {
    const a = document.createElement('audio');
    a.preload = 'none';
    a.dataset.audioChannel = channel;
    a.dataset.soundId = id;
    container.append(a);
    return a;
  };
  const music = [make('music', 'music-a'), make('music', 'music-b')];
  const weights = [0, 0];
  const rain = make('rain', 'rain-loop');
  rain.src =
    '/audio/' +
    (manifest.sfx.find((s) => s.id === 'rain-loop')?.file ??
      'sfx/rain-loop.mp3');
  rain.loop = true;
  const effects = new Map<EffectId, HTMLAudioElement>();
  const pause = (a: HTMLAudioElement, reset = false) => {
    a.pause();
    if (reset) a.currentTime = 0;
  };
  const safePlay = (a: HTMLAudioElement) => {
    if (!hidden && !disposed && unlocked)
      void a.play().catch(() => {
        if (a.dataset.soundId === 'sting-break') {
          sting = false;
          refreshLevels();
        }
      });
  };
  const target = () => musicLevel(prefs, narrating || sting);
  const refreshLevels = () => {
    music.forEach((a, i) => {
      a.volume = target() * (weights[i] ?? 0);
    });
    rain.volume = narrating || sting ? 0.025 : 0.1;
  };
  const stopEffect = (id: EffectId) => {
    const a = effects.get(id);
    if (a) pause(a, true);
    if (id === 'sting-break') {
      sting = false;
      refreshLevels();
    }
  };
  const prepare = (id: EffectId) => {
    const entry = manifest.sfx.find((s) => s.id === id);
    if (!entry) return;
    let a = effects.get(id);
    if (!a) {
      a = make('effect', id);
      a.src = '/audio/' + entry.file;
      effects.set(id, a);
      if (id === 'sting-break') {
        a.addEventListener('ended', () => {
          sting = false;
          refreshLevels();
        });
        a.addEventListener('error', () => {
          sting = false;
          refreshLevels();
        });
      }
    }
    return a;
  };
  const effect = (id: EffectId) => {
    if (!prefs.effects || hidden || !unlocked || disposed) return;
    const a = prepare(id);
    if (!a) return;
    pause(a, true);
    a.volume = 0.65;
    if (id === 'sting-break') {
      sting = true;
      refreshLevels();
    }
    safePlay(a);
  };
  const switchTrack = (track: Track) => {
    if (!track || !unlocked || hidden || !prefs.music) return;
    if (track.id === currentId) {
      const a = music[index];
      if (a && a.paused) safePlay(a);
      refreshLevels();
      return;
    }
    clearInterval(fade);
    fade = undefined;
    const old = music[index];
    index = 1 - index;
    const next = music[index];
    if (!next) return;
    pause(next, true);
    music.forEach((a) => {
      a.dataset.current = 'false';
    });
    next.dataset.current = 'true';
    weights[index] = 0;
    next.src = '/audio/' + track.file;
    next.loop = track.loop;
    next.volume = 0;
    currentId = track.id;
    safePlay(next);
    const start = performance.now();
    const oldWeight = weights[1 - index] ?? 0;
    fade = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / 1500);
      weights[index] = t;
      weights[1 - index] = oldWeight * (1 - t);
      refreshLevels();
      if (t === 1) {
        clearInterval(fade);
        fade = undefined;
        if (old) pause(old, true);
        refreshLevels();
      }
    }, 40);
  };
  const sync = () => {
    if (!unlocked || hidden || disposed) return;
    if (!prefs.music) {
      clearInterval(fade);
      fade = undefined;
      music.forEach((a) => pause(a));
    } else switchTrack(selectMusic(screen, solved));
    if (prefs.rain) safePlay(rain);
    else pause(rain);
    refreshLevels();
  };
  const unlock = () => {
    if (disposed) return;
    if (!unlocked) {
      unlocked = true;
      sync();
    }
  };
  const click = (e: Event) => {
    const el = e.target;
    if (el instanceof Element && el.closest('button, summary, input, select')) {
      unlock();
      if (!el.closest('.hold')) effect('ui-tap');
    }
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') unlock();
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  const unwatch = watchLifecycle(
    () => {
      hidden = true;
      clearInterval(fade);
      fade = undefined;
      music.forEach((a) => pause(a));
      pause(rain);
      for (const id of effects.keys()) stopEffect(id);
    },
    () => {
      hidden = false;
      sync();
    },
  );
  const instance = {
    refreshLevels,
    effect,
    prepare: (id: EffectId) => {
      const a = prepare(id);
      if (a) {
        a.preload = 'auto';
        a.load();
      }
    },
    stopEffect,
    screen: (next: string, isSolved = false) => {
      if (next === 's06' && screen !== 's06') {
        clearInterval(fade);
        fade = undefined;
        music.forEach((a) => pause(a, true));
        weights.fill(0);
        currentId = '';
      }
      screen = next;
      solved = isSolved;
      sync();
    },
    settings: (next: AudioPreferences) => {
      prefs = next;
      if (!prefs.effects) for (const id of effects.keys()) stopEffect(id);
      sync();
    },
    dispose: () => {
      disposed = true;
      clearInterval(fade);
      unwatch();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      for (const a of [...music, rain, ...effects.values()]) {
        pause(a, true);
        a.removeAttribute('src');
        a.load();
      }
      container.remove();
      if (controller === instance) controller = undefined;
    },
  };
  return instance;
}

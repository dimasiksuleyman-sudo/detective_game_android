/** Таймер хода (режим блиц). Идёт только пока `running`; по нулю один раз вызывает onExpire. */
import { useEffect, useRef } from 'react';
import { useTurnTimer } from '../store/turnTimerStore';
import { ru } from '../i18n/ru';

export function TurnTimer({
  turnKey,
  seconds,
  running,
  onExpire,
}: {
  turnKey: string;
  seconds: number;
  running: boolean;
  onExpire: () => void;
}) {
  const { key, elapsedMs } = useTurnTimer();
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    if (useTurnTimer.getState().key !== turnKey)
      useTurnTimer.setState({ key: turnKey, elapsedMs: 0 });
  }, [turnKey]);
  useEffect(() => {
    if (!running) return;
    const limit = seconds * 1000;
    if (
      useTurnTimer.getState().key === turnKey &&
      useTurnTimer.getState().elapsedMs >= limit
    ) {
      expire.current();
      return;
    }
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const state = useTurnTimer.getState();
      if (state.key !== turnKey) return;
      const next = state.elapsedMs + (now - last);
      last = now;
      useTurnTimer.setState({ elapsedMs: next });
      if (next >= limit) {
        clearInterval(id);
        expire.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, turnKey, seconds]);
  const elapsed = key === turnKey ? elapsedMs : 0;
  const left = Math.max(0, Math.ceil(seconds - elapsed / 1000));
  const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span
      role="timer"
      aria-label={ru.turn.timerLabel(text)}
      data-warning={left <= 10 || undefined}
    >
      ⏱ {text}
    </span>
  );
}

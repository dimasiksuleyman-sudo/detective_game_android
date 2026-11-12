import { useRef, useState, useEffect } from 'react';
export function HoldButton({
  children,
  onConfirm,
}: {
  children: React.ReactNode;
  onConfirm: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [holding, setHolding] = useState(false);
  const stop = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setHolding(false);
      onConfirm();
    }, 1000);
  };
  return (
    <button
      type="button"
      onContextMenu={(e) => e.preventDefault()}
      className={holding ? 'hold holding' : 'hold'}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={stop}
      onBlur={stop}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
      <span className="holdProgress" aria-hidden="true" />
    </button>
  );
}

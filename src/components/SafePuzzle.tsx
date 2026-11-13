import { useRef, useState } from 'react';
import type { CaseFile } from '../content/schema';
import { ru } from '../i18n/ru';
import { playEffect } from '../platform/soundscape';
type Hotspot = CaseFile['locations'][number]['hotspots'][number];
export function SafePuzzle(props: Parameters<typeof CombinationLock>[0]) {
  return (
    <CombinationLock
      key={`${props.caseId}/${props.hotspot.id}/${props.hotspot.lock?.digits}`}
      {...props}
    />
  );
}
function CombinationLock({
  caseId,
  hotspot,
  opened,
  collected,
  enabled,
  submit,
  take,
}: {
  caseId: string;
  hotspot: Hotspot;
  opened: boolean;
  collected: string[];
  enabled: boolean;
  submit: (code: string) => Promise<boolean>;
  take: (id: string) => void;
}) {
  const isBriefcase = hotspot.label.toLocaleLowerCase('ru') === 'портфель';
  const inside = isBriefcase ? ru.safe.insideBriefcase : ru.safe.inside;
  const open = isBriefcase ? ru.safe.openBriefcase : ru.safe.open;
  const [digits, setDigits] = useState(() =>
    Array.from({ length: hotspot.lock?.digits ?? 0 }, () => 0),
  );
  const [wrong, setWrong] = useState(0);
  const [pending, setPending] = useState(false);
  const starts = useRef(new Map<number, number>());
  const suppress = useRef<Record<number, boolean>>({});
  const turn = (i: number, delta: number) => {
    if (!enabled || pending) return;
    playEffect('ui-tap');
    setWrong(0);
    setDigits((old) =>
      old.map((v, j) => (i === j ? (v + delta + 10) % 10 : v)),
    );
  };
  if (!hotspot.lock || !hotspot.container) return null;
  if (opened)
    return (
      <section aria-label={inside}>
        <div className="safeInterior">
          <img
            src={`/cases/${caseId}/${hotspot.container.image}`}
            alt={inside}
          />
          {hotspot.container.items.map((item, i) => (
            <button
              key={item.clueId}
              aria-label={ru.safe.item + ' ' + (i + 1)}
              disabled={!enabled && !collected.includes(item.clueId)}
              className="safeItem"
              style={{
                left: item.rect.x * 100 + '%',
                top: item.rect.y * 100 + '%',
                width: item.rect.w * 100 + '%',
                height: item.rect.h * 100 + '%',
              }}
              onClick={() => take(item.clueId)}
            />
          ))}
        </div>
      </section>
    );
  return (
    <section
      aria-label={ru.safe.title}
      className={wrong ? 'combination wrong' : 'combination'}
    >
      <div
        className="safeDoor"
        style={{ backgroundImage: `url(/cases/${caseId}/${hotspot.closeup})` }}
      >
        <div className="wheels" data-silent-tap="true">
          {digits.map((digit, i) => (
            <div className="wheel" key={i}>
              <button
                aria-label={ru.safe.decrement + ' ' + (i + 1)}
                onClick={() => turn(i, -1)}
                disabled={!enabled || pending}
              >
                −
              </button>
              <div
                role="spinbutton"
                tabIndex={enabled ? 0 : -1}
                aria-label={ru.safe.digit + ' ' + (i + 1)}
                aria-valuemin={0}
                aria-valuemax={9}
                aria-valuenow={digit}
                aria-disabled={!enabled || pending}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  starts.current.set(i, e.clientY);
                  if (e.buttons === 1)
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerCancel={() => {
                  starts.current.delete(i);
                }}
                onPointerUp={(e) => {
                  const y = starts.current.get(i);
                  starts.current.delete(i);
                  if (y !== undefined && Math.abs(e.clientY - y) > 20) {
                    suppress.current[i] = true;
                    turn(i, e.clientY < y ? 1 : -1);
                  }
                }}
                onClick={() => {
                  if (suppress.current[i]) {
                    suppress.current[i] = false;
                    return;
                  }
                  turn(i, 1);
                }}
                onKeyDown={(e) => {
                  if (!enabled || pending) return;
                  if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault();
                    if (e.key === 'Home' || e.key === 'End') {
                      playEffect('ui-tap');
                      setWrong(0);
                      setDigits((old) =>
                        old.map((v, j) =>
                          j === i ? (e.key === 'Home' ? 0 : 9) : v,
                        ),
                      );
                    } else turn(i, e.key === 'ArrowUp' ? 1 : -1);
                  }
                }}
              >
                {digit}
              </div>
              <button
                aria-label={ru.safe.increment + ' ' + (i + 1)}
                onClick={() => turn(i, 1)}
                disabled={!enabled || pending}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>
      {wrong > 0 && <p role="status">{ru.safe.wrong}</p>}
      <button
        disabled={!enabled || pending}
        onClick={() => {
          setWrong(0);
          setPending(true);
          void submit(digits.join(''))
            .then((ok) => {
              if (!ok) {
                setWrong((n) => n + 1);
                playEffect('error');
              }
            })
            .finally(() => setPending(false));
        }}
      >
        {open}
      </button>
    </section>
  );
}

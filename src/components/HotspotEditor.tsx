import { useState } from 'react';
import { pilot } from '../content/loader';
import { ru } from '../i18n/ru';
import { copyToClipboard } from '../platform/clipboard';
export default function HotspotEditor() {
  const [location, setLocation] = useState(pilot.locations[0]?.id ?? '');
  const room = pilot.locations.find((l) => l.id === location);
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0.1, h: 0.1 });
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify({ rect }, null, 2);
  return (
    <section>
      <h2>{ru.qa.editor}</h2>
      <select
        aria-label={ru.game.search}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      >
        {pilot.locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {room && (
        <div
          className="editorImage"
          onClick={(e) => {
            const b = e.currentTarget.getBoundingClientRect();
            setRect({
              ...rect,
              x: Math.min(
                1 - rect.w,
                Math.max(0, (e.clientX - b.left) / b.width),
              ),
              y: Math.min(
                1 - rect.h,
                Math.max(0, (e.clientY - b.top) / b.height),
              ),
            });
            setCopied(false);
          }}
        >
          <img
            draggable={false}
            src={'/cases/' + pilot.id + '/' + room.image}
            alt={room.name}
          />
          {room.hotspots.map((h) => (
            <span
              key={h.id}
              className="editorExisting"
              style={{
                left: h.rect.x * 100 + '%',
                top: h.rect.y * 100 + '%',
                width: h.rect.w * 100 + '%',
                height: h.rect.h * 100 + '%',
              }}
            />
          ))}
          <span
            className="editorRect"
            style={{
              left: rect.x * 100 + '%',
              top: rect.y * 100 + '%',
              width: rect.w * 100 + '%',
              height: rect.h * 100 + '%',
            }}
          />
        </div>
      )}
      {(['x', 'y', 'w', 'h'] as const).map((k) => (
        <label key={k}>
          {ru.qa[k]}
          <input
            type="number"
            min={k === 'w' || k === 'h' ? 0.01 : 0}
            max={1}
            step={0.01}
            value={rect[k]}
            onChange={(e) => {
              const v = Math.max(
                k === 'w' || k === 'h' ? 0.01 : 0,
                Math.min(1, Number(e.target.value)),
              );
              setRect((old) => {
                const next = { ...old, [k]: v };
                next.x = Math.min(next.x, 1 - next.w);
                next.y = Math.min(next.y, 1 - next.h);
                return next;
              });
              setCopied(false);
            }}
          />
        </label>
      ))}
      <pre data-testid="hotspot-json">{json}</pre>
      <button
        onClick={() => {
          void copyToClipboard(json).then(() => setCopied(true));
        }}
      >
        {ru.qa.copy}
      </button>
      {copied && <p role="status">{ru.qa.copied}</p>}
    </section>
  );
}

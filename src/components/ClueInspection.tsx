/**
 * Осмотр предмета (point-and-click, ADR-019): увеличение и перемещение картинки, поиск деталей.
 *
 * Почему своё масштабирование: раньше «Увеличить» растягивало картинку от левого верхнего
 * угла, и нужное место уезжало за край; двигать картинку пальцем было неудобно.
 * Теперь масштаб меняется вокруг центра видимой области (или точки между пальцами),
 * увеличенную картинку можно таскать одним пальцем/мышью, разводить двумя пальцами.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { CaseFile } from '../content/schema';
import { ru } from '../i18n/ru';
import styles from './ClueInspection.module.css';
type Inspection = NonNullable<CaseFile['clues'][number]['inspection']>;
type Point = { x: number; y: number };
const MIN = 1;
const MAX = 3;
/** Сдвиг пальца, после которого касание считается перетаскиванием, а не нажатием. */
const DRAG = 8;
const clamp = (z: number) => Math.min(MAX, Math.max(MIN, z));

export function ClueInspection({
  caseId,
  title,
  inspection,
  discovered,
  enabled,
  inspect,
}: {
  caseId: string;
  title: string;
  inspection: Inspection;
  discovered: string[];
  enabled: boolean;
  inspect: (x: number, y: number) => void;
}) {
  const [zoom, setZoom] = useState(MIN);
  const viewport = useRef<HTMLDivElement>(null);
  // Точка картинки (доли 0..1), которая после смены масштаба должна оказаться под anchor.
  const pending = useRef<{ target: Point; anchor: Point } | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    scroll: Point;
    dragging: boolean;
    pinch?: { distance: number; zoom: number } | undefined;
  } | null>(null);
  const suppressClick = useRef(false);

  /** Меняет масштаб так, чтобы точка картинки под anchor (px во viewport) осталась на месте. */
  const zoomAround = (next: number, anchor?: Point, target?: Point) => {
    const v = viewport.current;
    if (!v) return;
    const a = anchor ?? { x: v.clientWidth / 2, y: v.clientHeight / 2 };
    const size = v.scrollWidth;
    pending.current = {
      anchor: a,
      target: target ?? {
        x: (v.scrollLeft + a.x) / size,
        y: (v.scrollTop + a.y) / size,
      },
    };
    setZoom(clamp(next));
  };
  useLayoutEffect(() => {
    const v = viewport.current;
    const p = pending.current;
    if (!v || !p) return;
    // Увеличенную картинку двигает палец, а не страница — поэтому показываем её целиком.
    if (zoom > MIN) v.scrollIntoView?.({ block: 'nearest' });
    pending.current = null;
    const size = v.scrollWidth;
    v.scrollTo({
      left: p.target.x * size - p.anchor.x,
      top: p.target.y * size - p.anchor.y,
    });
  }, [zoom]);

  const local = (e: ReactPointerEvent) => {
    const r = viewport.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const v = viewport.current;
    if (!v) return;
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    if (pts.length === 1 && pts[0]) {
      suppressClick.current = false;
      gesture.current = {
        start: pts[0],
        scroll: { x: v.scrollLeft, y: v.scrollTop },
        dragging: false,
      };
    } else if (pts.length === 2 && pts[0] && pts[1] && gesture.current) {
      gesture.current.pinch = {
        distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        zoom,
      };
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const v = viewport.current;
    const g = gesture.current;
    if (!v || !g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    if (g.pinch && pts.length >= 2 && pts[0] && pts[1]) {
      suppressClick.current = true;
      const mid = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      zoomAround((g.pinch.zoom * distance) / g.pinch.distance, mid);
      return;
    }
    const p = pts[0];
    if (!p || zoom <= MIN) return;
    const dx = p.x - g.start.x,
      dy = p.y - g.start.y;
    if (!g.dragging && Math.hypot(dx, dy) < DRAG) return;
    if (!g.dragging) {
      g.dragging = true;
      suppressClick.current = true;
      v.setPointerCapture?.(e.pointerId);
    }
    v.scrollLeft = g.scroll.x - dx;
    v.scrollTop = g.scroll.y - dy;
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else if (gesture.current) gesture.current.pinch = undefined;
  };

  return (
    <section aria-label={ru.inspection.title}>
      <p>{ru.inspection.help}</p>
      <div>
        <button
          type="button"
          disabled={zoom <= MIN}
          onClick={() => zoomAround(zoom - 0.5)}
        >
          {ru.inspection.zoomOut}
        </button>
        <output aria-label={ru.inspection.scale}>
          {Math.round(zoom * 100)}%
        </output>
        <button
          type="button"
          disabled={zoom >= MAX}
          onClick={() => zoomAround(zoom + 0.5)}
        >
          {ru.inspection.zoomIn}
        </button>
      </div>
      <div
        ref={viewport}
        className={styles.viewport}
        data-zoomed={zoom > MIN || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // Перетаскивание не должно засчитываться как нажатие на участок.
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div className={styles.stage} style={{ width: zoom * 100 + '%' }}>
          <img
            src={`/cases/${caseId}/${inspection.image}`}
            alt={title}
            draggable={false}
          />
          {inspection.overlays?.map((o, i) => (
            <span
              key={i}
              data-inspection-overlay={i}
              style={{
                position: 'absolute',
                left: o.rect.x * 100 + '%',
                top: o.rect.y * 100 + '%',
                width: o.rect.w * 100 + '%',
                height: o.rect.h * 100 + '%',
                whiteSpace: 'pre',
                overflow: 'hidden',
                color: '#29231c',
                // Размер зависит от листа и длины строк, а не от ширины экрана.
                fontSize: `${Math.min(
                  o.handwritten ? 4.5 : 2.1,
                  (o.rect.w * 100) /
                    (Math.max(
                      ...o.text.split('\n').map((line) => line.length),
                    ) *
                      0.65),
                  (o.rect.h * 100) / (o.text.split('\n').length * 1.6),
                )}cqw`,
                fontFamily: o.handwritten ? 'cursive' : 'monospace',
                lineHeight: 1.6,
                pointerEvents: 'none',
                fontStyle: o.handwritten ? 'italic' : 'normal',
              }}
            >
              {o.text}
            </span>
          ))}
          {inspection.details.map((detail, index) => (
            <button
              type="button"
              key={detail.id}
              className={styles.region}
              aria-label={ru.inspection.area + ' ' + (index + 1)}
              disabled={!enabled && !discovered.includes(detail.id)}
              style={{
                left: detail.rect.x * 100 + '%',
                top: detail.rect.y * 100 + '%',
                width: detail.rect.w * 100 + '%',
                height: detail.rect.h * 100 + '%',
              }}
              onClick={() => {
                if (!discovered.includes(detail.id))
                  inspect(
                    detail.rect.x + detail.rect.w / 2,
                    detail.rect.y + detail.rect.h / 2,
                  );
                // Найденная деталь — в центре увеличенного вида.
                zoomAround(Math.max(2, zoom), undefined, {
                  x: detail.rect.x + detail.rect.w / 2,
                  y: detail.rect.y + detail.rect.h / 2,
                });
              }}
            />
          ))}
        </div>
      </div>
      {inspection.details
        .filter((d) => discovered.includes(d.id))
        .map((d) => (
          <p key={d.id}>{d.text}</p>
        ))}
    </section>
  );
}

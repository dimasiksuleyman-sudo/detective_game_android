import { useEffect, useRef, useState } from 'react';
import type { CaseFile } from '../content/schema';
import { ru } from '../i18n/ru';
import styles from './ClueInspection.module.css';
type Inspection = NonNullable<CaseFile['clues'][number]['inspection']>;
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
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<Inspection['details'][number]['rect']>();
  const viewport = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus && viewport.current && stage.current) {
      viewport.current.scrollTo({
        left:
          (focus.x + focus.w / 2) * stage.current.offsetWidth -
          viewport.current.clientWidth / 2,
        top:
          (focus.y + focus.h / 2) * stage.current.offsetHeight -
          viewport.current.clientHeight / 2,
      });
    }
  }, [focus, zoom]);
  return (
    <section aria-label={ru.inspection.title}>
      <p>{ru.inspection.help}</p>
      <div>
        <button
          type="button"
          disabled={zoom <= 1}
          onClick={() => {
            setFocus(undefined);
            setZoom((z) => Math.max(1, z - 0.5));
          }}
        >
          {ru.inspection.zoomOut}
        </button>
        <output aria-label={ru.inspection.scale}>
          {Math.round(zoom * 100)}%
        </output>
        <button
          type="button"
          disabled={zoom >= 3}
          onClick={() => {
            setFocus(undefined);
            setZoom((z) => Math.min(3, z + 0.5));
          }}
        >
          {ru.inspection.zoomIn}
        </button>
      </div>
      <div ref={viewport} className={styles.viewport}>
        <div
          ref={stage}
          className={styles.stage}
          style={{ width: zoom * 100 + '%' }}
        >
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
                setFocus(detail.rect);
                setZoom(2);
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

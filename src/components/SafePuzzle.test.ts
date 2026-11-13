import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SafePuzzle } from './SafePuzzle';
import { loadCase } from '../content/loader';
it.each([1, 3, 4, 8])('замок рисует %i колёсиков из схемы', (digits) => {
  const c = structuredClone(loadCase('case-001-blue-owl'));
  const hotspot = c.locations.flatMap((l) => l.hotspots).find((h) => h.lock);
  if (!hotspot?.lock) throw new Error('Missing lock');
  hotspot.lock.digits = digits;
  hotspot.lock.code = '0'.repeat(digits);
  const html = renderToStaticMarkup(
    createElement(SafePuzzle, {
      caseId: c.id,
      hotspot,
      opened: false,
      collected: [],
      enabled: true,
      submit: async () => false,
      take: () => {},
    }),
  );
  expect(html.match(/role="spinbutton"/g)).toHaveLength(digits);
});

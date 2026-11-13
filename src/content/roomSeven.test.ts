/** Контроль утверждённого канона, AND-дедукции и достижимости второго дела. */
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { loadCase, listCases } from './loader';
import { caseSchema } from './schema';
import { validateCase } from './validate';
import { reduce, type GameState, type Action } from '../game/engine';
const c = loadCase('case-002-room-seven');
function action(state: GameState | null, a: Action) {
  const next = reduce(c, state, a);
  if (!next) throw new Error('Missing game');
  return next;
}
function start() {
  return action(
    action(null, { type: 'START_GAME', names: ['А'], roundLimit: 8 }),
    { type: 'BEGIN_TURN' },
  );
}
function player(s: GameState) {
  const p = s.players[0];
  if (!p) throw new Error('Missing player');
  return p;
}
function search(s: GameState, locationId: string, hotspotId: string) {
  return action(s, { type: 'SEARCH_HOTSPOT', locationId, hotspotId });
}
it('все встроенные дела проходят семантический валидатор', () => {
  for (const item of listCases())
    expect(validateCase(item).errors, item.id).toEqual([]);
  expect(c.facts).toHaveLength(30);
  expect(c.clues).toHaveLength(14);
  expect(c.suspects.map((s) => [s.id, s.actorId, s.age])).toEqual([
    ['s-nadia', 'a13-nadia', 39],
    ['s-zoya', 'a11-zoya', 63],
    ['s-ruslan', 'a08-ruslan', 38],
    ['s-dmitry', 'a12-dmitry', 31],
  ]);
  expect(c.solution).toMatchObject({
    culpritId: 's-nadia',
    motiveId: 'm-heirloom',
    methodId: 'w-sedative',
  });
  expect(c.locations.map((l) => l.hotspots.length)).toEqual([6, 7, 5]);
  expect(caseSchema.safeParse(c).success).toBe(true);
});
it.each(['f-portfel-hint', 'f-first-shop'])(
  'без %s портфель не решается самостоятельно',
  (fact) => {
    const copy = structuredClone(c);
    for (const cl of copy.clues)
      cl.revealsFactIds = cl.revealsFactIds.filter((id) => id !== fact);
    const report = validateCase(copy);
    expect(report.reached).not.toContain('c-receipt');
    expect(report.reached).not.toContain('c-buyer-note');
    expect(report.errors).toContain('unreachable c-receipt');
  },
);
it('кратчайшая победа: один хотспот с ключевым фактом, правильное обвинение', () => {
  let s = search(start(), 'l-room7', 'h-balcony-door');
  expect(s.action?.used).toBe(1);
  expect(player(s).facts).toContain('f-wet-footprints');
  s = action(s, {
    type: 'ACCUSE',
    suspectId: 's-nadia',
    motiveId: 'm-heirloom',
    methodId: 'w-sedative',
    evidence: ['f-wet-footprints'],
  });
  expect(s.phase).toBe('finished');
  expect(s.winners).toEqual([0]);
  expect(s.round).toBe(1);
});
it('три детали не выдаются при находке и открываются личным осмотром', () => {
  for (const [locationId, hotspotId, clueId, factId, detailId] of [
    ['l-room7', 'h-tea-tray', 'c-teacup', 'f-tea-drugged', 'd-saucer-residue'],
    ['l-corridor', 'h-partition', 'c-partition', 'f-grey-thread', 'd-thread'],
    [
      'l-corridor',
      'h-linen-cart',
      'c-chronometer',
      'f-engraving',
      'd-engraving',
    ],
  ]) {
    if (!locationId || !hotspotId || !clueId || !factId || !detailId)
      throw new Error('Invalid fixture');
    let s = search(start(), locationId, hotspotId);
    expect(player(s).facts).not.toContain(factId);
    const d = c.clues.find((cl) => cl.id === clueId)?.inspection?.details[0];
    if (!d) throw new Error('Missing detail');
    s = action(s, {
      type: 'INSPECT_CLUE',
      clueId,
      x: d.rect.x + d.rect.w / 2,
      y: d.rect.y + d.rect.h / 2,
    });
    expect(player(s).facts).toContain(factId);
    expect(player(s).inspectedDetails).toContain(detailId);
    expect(s.action?.used).toBe(1);
  }
});
it('свидетельство Руслана обязательно для ночного слома Надежды, afterBreak связан с темой', () => {
  let s = start();
  const p = player(s);
  p.clues = ['c-partition', 'c-wet-jacket'];
  p.facts = ['f-grey-thread'];
  p.stress['s-nadia'] = 6;
  s = action(s, {
    type: 'PRESENT_CLUE',
    suspectId: 's-nadia',
    clueId: 'c-partition',
    tone: 'neutral',
  });
  expect(player(s).truths).not.toContain('t-night');
  s = action(s, { type: 'END_TURN' });
  player(s).stress['s-ruslan'] = 4;
  s = action(s, {
    type: 'PRESENT_CLUE',
    suspectId: 's-ruslan',
    clueId: 'c-wet-jacket',
    tone: 'neutral',
  });
  expect(player(s).facts).toContain('f-figure-on-balcony');
  s = action(s, { type: 'END_TURN' });
  player(s).stress['s-nadia'] = 6;
  s = action(s, {
    type: 'PRESENT_CLUE',
    suspectId: 's-nadia',
    clueId: 'c-partition',
    tone: 'neutral',
  });
  expect(player(s).truths).toContain('t-night');
  expect(player(s).truths).not.toContain('t-knew');
  s = action(s, {
    type: 'ASK_OFFLINE_QUESTION',
    suspectId: 's-nadia',
    questionId: 'q-nadia-2',
    tone: 'neutral',
  });
  expect(player(s).history.at(-1)?.answer).toBe(
    'На балконе. Вы уже знаете зачем.',
  );
  s = action(s, {
    type: 'ASK_OFFLINE_QUESTION',
    suspectId: 's-nadia',
    questionId: 'q-nadia-1',
    tone: 'neutral',
  });
  expect(player(s).history.at(-1)?.answer).toBe(
    'Нет. Видела его за ужином, как все.',
  );
});
it('план озвучки содержит девять совпадающих источников и речь без цифр', () => {
  const plan = JSON.parse(readFileSync('content/narration/plan.json', 'utf8'))
    .cases[c.id];
  const config = JSON.parse(
    readFileSync('content/narration/elevenlabs.json', 'utf8'),
  ).cases[c.id];
  expect(plan.clips).toHaveLength(9);
  for (const clip of plan.clips as {
    id: string;
    source: (string | number)[];
  }[]) {
    let value: unknown = c;
    for (const field of clip.source)
      value = (value as Record<string, unknown>)[field];
    expect(config.speech[clip.id].text).toBe(value);
    expect(config.speech[clip.id].say).not.toMatch(/\d/);
  }
});

it('факты и хронология совпадают с утверждённой библией, меняется только пунктуация', () => {
  const bible = readFileSync('docs/cases/case-002-room-seven.md', 'utf8');
  const rows = (heading: string) =>
    bible
      .split(heading)[1]
      ?.split('\n## ')[0]
      ?.split('\n')
      .filter((line) => line.startsWith('|') && !line.startsWith('|---'))
      .slice(1)
      .map((line) =>
        line
          .split('|')
          .slice(1, -1)
          .map((v) => v.trim()),
      );
  const canonical = rows('## Факты');
  if (!canonical) throw new Error('Missing bible facts');
  const polish = (s: string) => s.replace(/; (?=[А-ЯЁ])/gu, '. ');
  expect(
    c.facts.map((f) => [f.id, f.text, f.time ?? '', f.importance]),
  ).toEqual(canonical.map((row) => row.map(polish)));
  expect(c.timelineTruth.map((t) => [t.time, t.event])).toEqual(
    rows('### Хронология (timelineTruth)')?.map((row) => row.map(polish)),
  );
  expect(
    c.suspects[0]?.breakpoints.map((b) => [
      b.clueId,
      b.requiresFactIds,
      b.unlocksTruthIds,
      b.revealsFactIds,
    ]),
  ).toEqual([
    ['c-receipt', ['f-engraving'], ['t-knew'], ['f-nadia-motive']],
    [
      'c-partition',
      ['f-grey-thread', 'f-figure-on-balcony'],
      ['t-night'],
      ['f-nadia-confession'],
    ],
  ]);
});

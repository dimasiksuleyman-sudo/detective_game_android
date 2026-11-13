/** Канон дела №3, три ступени признания и неопровергнутые улики против невиновных. */
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { loadCase } from './loader';
import { validateCase } from './validate';
import { reduce, type Action, type GameState } from '../game/engine';
import { keyEvidenceIds, scoreAccusation } from '../game/rules/scoring';

const c = loadCase('case-003-cold-room');
function act(state: GameState | null, action: Action): GameState {
  const next = reduce(c, state, action);
  if (!next) throw new Error('Missing game');
  return next;
}
function start() {
  return act(act(null, { type: 'START_GAME', names: ['А'], roundLimit: 8 }), {
    type: 'BEGIN_TURN',
  });
}
function player(s: GameState) {
  const p = s.players[0];
  if (!p) throw new Error('Missing player');
  return p;
}
function search(s: GameState, room: string, hotspot: string) {
  return act(s, {
    type: 'SEARCH_HOTSPOT',
    locationId: room,
    hotspotId: hotspot,
  });
}
function inspect(s: GameState, clueId: string) {
  const d = c.clues.find((cl) => cl.id === clueId)?.inspection?.details[0];
  if (!d) throw new Error('Missing detail');
  return act(s, {
    type: 'INSPECT_CLUE',
    clueId,
    x: d.rect.x + d.rect.w / 2,
    y: d.rect.y + d.rect.h / 2,
  });
}
function question(
  s: GameState,
  id: string,
  tone: 'neutral' | 'pressure' = 'neutral',
) {
  return act(s, {
    type: 'ASK_OFFLINE_QUESTION',
    suspectId: 's-margarita',
    questionId: id,
    tone,
  });
}
function present(s: GameState, clueId: string, suspectId = 's-margarita') {
  return act(s, { type: 'PRESENT_CLUE', suspectId, clueId, tone: 'neutral' });
}
/** Четыре обыска, включая самостоятельную дедукцию по двум разным локациям. */
function evidence() {
  let s = start();
  s = inspect(search(s, 'l-shop', 'h-thermograph'), 'c-thermograph');
  s = search(s, 'l-shop', 'h-schedule');
  s = inspect(search(s, 'l-shop', 'h-chamber-door'), 'c-seal');
  s = act(s, { type: 'END_TURN' });
  s = search(s, 'l-chamber', 'h-outline');
  s = inspect(search(s, 'l-chamber', 'h-frost-floor'), 'c-frost-floor');
  s = act(s, { type: 'END_TURN' });
  s = act(s, {
    type: 'OPEN_LOCK',
    locationId: 'l-shop',
    hotspotId: 'h-desk',
    code: '0418',
  });
  for (const clueId of ['c-check-book', 'c-complaint', 'c-artyom-iou'])
    s = act(s, { type: 'TAKE_CONTAINER_ITEM', hotspotId: 'h-desk', clueId });
  s = act(s, { type: 'END_TURN' });
  for (const h of ['h-booth', 'h-booth-table', 'h-truck-cab', 'h-truck-back'])
    s = search(s, 'l-yard', h);
  return act(s, { type: 'END_TURN' });
}
it('схема, достижимость, весы и канонические тексты совпадают с библией', () => {
  expect(validateCase(c).errors).toEqual([]);
  expect(c.facts).toHaveLength(33);
  expect(c.clues).toHaveLength(12);
  expect(c.locations.map((l) => l.hotspots.length)).toEqual([5, 6, 5]);
  const bible = readFileSync('docs/cases/case-003-cold-room.md', 'utf8');
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
          .map((v) => v.trim().replace(/; (?=[А-ЯЁ])/gu, '. ')),
      );
  expect(
    c.facts.map((f) => [f.id, f.text, f.time ?? '', f.importance]),
  ).toEqual(rows('## Факты'));
  expect(c.timelineTruth.map((t) => [t.time, t.event])).toEqual(
    rows('### Хронология (timelineTruth)'),
  );
  const keys = keyEvidenceIds(c);
  for (const id of [
    'f-pavel-artyom-threat',
    'f-artyom-away',
    'f-artyom-smoke',
    'f-semyon-quarrel',
    'f-keys-open',
    'f-semyon-slept',
  ])
    expect(keys.has(id), id).toBe(false);
});
it('минимальный путь: одна ключевая улика в первом ходе — принято, 22 очка', () => {
  let s = search(start(), 'l-yard', 'h-truck-cab');
  s = act(s, {
    type: 'ACCUSE',
    suspectId: 's-margarita',
    motiveId: 'm-cover-fraud',
    methodId: 'w-locked-cold',
    evidence: ['c-certificate'],
  });
  expect(player(s).accusation?.accepted).toBe(true);
  expect(player(s).score).toBe(22);
  expect(s.phase).toBe('finished');
});
it('самостоятельный сейф требует обоих фактов в графе, ввод кода не выдаёт три предмета автоматически', () => {
  for (const missing of ['f-safe-note', 'f-tab-number']) {
    const copy = structuredClone(c);
    for (const clue of copy.clues)
      clue.revealsFactIds = clue.revealsFactIds.filter((id) => id !== missing);
    expect(validateCase(copy).reached).not.toContain('c-check-book');
  }
  let s = act(start(), {
    type: 'OPEN_LOCK',
    locationId: 'l-shop',
    hotspotId: 'h-desk',
    code: '0000',
  });
  expect(player(s).openedLocks).toEqual([]);
  expect(s.action).toBeNull();
  s = act(s, {
    type: 'OPEN_LOCK',
    locationId: 'l-shop',
    hotspotId: 'h-desk',
    code: '0418',
  });
  expect(player(s).openedLocks).toEqual(['h-desk']);
  expect(player(s).clues).toEqual([]);
  for (const clueId of ['c-check-book', 'c-complaint', 'c-artyom-iou'])
    s = act(s, { type: 'TAKE_CONTAINER_ITEM', hotspotId: 'h-desk', clueId });
  expect(player(s).clues).toEqual([
    'c-check-book',
    'c-complaint',
    'c-artyom-iou',
  ]);
  expect(s.action?.used).toBe(1);
});
it.each([
  ['l-shop', 'h-thermograph', 'c-thermograph', 'f-door-openings'],
  ['l-shop', 'h-chamber-door', 'c-seal', 'f-seal-07'],
  ['l-chamber', 'h-frost-floor', 'c-frost-floor', 'f-two-tracks'],
])(
  'деталь %s/%s доступна только после личного осмотра',
  (room, hotspot, clue, fact) => {
    let s = search(start(), room, hotspot);
    expect(player(s).facts).not.toContain(fact);
    const used = s.action?.used;
    s = inspect(s, clue);
    expect(player(s).facts).toContain(fact);
    expect(s.action?.used).toBe(used);
    expect(inspect(s, clue)).toEqual(s);
  },
);
it('три последовательные ступени и afterBreak: шесть ключевых доказательств, 64 очка с ×2', () => {
  let s = evidence();
  expect(s.round).toBe(5);
  s = question(s, 'q-margarita-2', 'pressure');
  s = question(s, 'q-margarita-5', 'pressure');
  s = present(s, 'c-check-book');
  expect(player(s).truths).toEqual(['t-signed']);
  s = act(s, { type: 'END_TURN' });
  s = present(s, 'c-gate-log');
  expect(player(s).truths).toEqual(['t-signed', 't-night']);
  s = question(s, 'q-margarita-1');
  expect(player(s).history.at(-1)?.answer).toBe(
    'И ночью, в два. Вы уже знаете.',
  );
  s = present(s, 'c-seal');
  expect(player(s).truths).toEqual(['t-signed', 't-night', 't-locked']);
  expect(player(s).facts).toContain('f-margarita-confession');
  const proof = [
    'c-check-book',
    'c-certificate',
    'c-seal',
    'c-gate-log',
    'f-door-openings',
    'f-margarita-confession',
  ];
  const noConfession = scoreAccusation(
    c,
    {
      methodId: 'w-locked-cold',
      evidence: proof.filter((x) => x !== 'f-margarita-confession'),
    },
    { round: s.round, roundLimit: 8, finalMode: false },
  );
  expect(noConfession.confession).toBe(false);
  s = act(s, {
    type: 'ACCUSE',
    suspectId: 's-margarita',
    motiveId: 'm-cover-fraud',
    methodId: 'w-locked-cold',
    evidence: proof,
  });
  expect(player(s).accusation?.accepted).toBe(true);
  expect(player(s).accusation?.breakdown).toMatchObject({
    base: 10,
    method: 5,
    evidence: 15,
    speed: 2,
    confession: true,
    total: 64,
  });
  expect(player(s).score).toBe(64);
});
it.each([
  ['s-artyom', 'l-chamber', 'h-outline', 'f-pavel-artyom-threat', 'm-theft'],
  ['s-semyon', 'l-yard', 'h-booth-table', 'f-semyon-bottle', 'm-revenge'],
])(
  'весы: обвинение %s с его уликой — выбывание и ноль очков',
  (suspectId, room, spot, fact, motiveId) => {
    let s = search(start(), room, spot);
    expect(player(s).facts).toContain(fact);
    s = act(s, {
      type: 'ACCUSE',
      suspectId,
      motiveId,
      methodId: 'w-locked-cold',
      evidence: [fact],
    });
    expect(player(s).eliminated).toBe(true);
    expect(player(s).score).toBe(0);
    expect(s.winners).toEqual([]);
  },
);
it.each(['s-artyom', 's-semyon'])(
  '%s не признаётся в убийстве при стрессе 9 и предъявлении всех доступных улик',
  (suspectId) => {
    let s = evidence();
    const clues = [...player(s).clues];
    for (const clue of clues) {
      if ((s.action?.used ?? 0) === 3) s = act(s, { type: 'END_TURN' });
      player(s).stress[suspectId] = 9;
      s = present(s, clue, suspectId);
      expect(player(s).facts).not.toContain('f-margarita-confession');
      expect(player(s).truths).not.toContain('t-locked');
    }
  },
);
it.each([
  [8, true, false],
  [9, false, false],
  [9, true, true],
])(
  'давление %s, одна требуемая находка %s: признание %s',
  (stress, hasFact, expected) => {
    let s = start();
    player(s).clues = ['c-seal'];
    player(s).facts = hasFact ? ['f-seal-intact'] : [];
    player(s).stress['s-margarita'] = stress as number;
    s = present(s, 'c-seal');
    expect(player(s).facts.includes('f-margarita-confession')).toBe(expected);
  },
);
it('изображение осмотра — полноценный рендер, предмет совсем без рендера отвергается', () => {
  expect(c.clues.find((x) => x.id === 'c-thermograph')?.image).toBeUndefined();
  const copy = structuredClone(c);
  const clue = copy.clues.find((x) => x.id === 'c-thermograph');
  if (!clue) throw new Error('clue');
  delete clue.inspection;
  expect(validateCase(copy).errors).toContain('clue has no rendering');
});

it('девять MP3 соответствуют текущим текстам, одобренным голосам, размерам и хешам', async () => {
  const { createHash } = await import('node:crypto');
  const { narrationFor, hintNarration } = await import('./narration');
  const manifest = JSON.parse(
    readFileSync('public/cases/' + c.id + '/audio/manifest.json', 'utf8'),
  ) as {
    voices: Record<string, string>;
    clips: {
      id: string;
      text: string;
      file: string;
      bytes: number;
      sha256: string;
      seconds: number;
    }[];
  };
  expect(manifest.voices).toEqual({
    narrator: 'TUQNWEvVPBLzMBSVDPUA',
    chief: 'pM78bgjPVk0JXtaEnFoj',
  });
  expect(manifest.clips).toHaveLength(9);
  expect(new Set(manifest.clips.map((clip) => clip.id)).size).toBe(9);
  for (const clip of manifest.clips) {
    const bytes = readFileSync('public/cases/' + c.id + '/audio/' + clip.file);
    expect(bytes.length).toBe(clip.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(clip.sha256);
    expect(clip.seconds).toBeGreaterThan(1);
    expect(narrationFor(c.id, clip.id, clip.text)).toBeDefined();
    expect(narrationFor(c.id, clip.id, 'Изменённый текст')).toBeUndefined();
  }
  expect(narrationFor(c.id, 'briefing', c.briefing)).toBeDefined();
  for (const hint of c.hints)
    expect(hintNarration(c.id, hint.text)).toBeDefined();
  expect(
    narrationFor(c.id, 'solution-explanation', c.solution.explanation),
  ).toBeDefined();
  c.solution.reconstruction.forEach((frame, i) =>
    expect(
      narrationFor(c.id, 'reconstruction-' + (i + 1), frame.caption),
    ).toBeDefined(),
  );
});
it('все произносимые версии актуальны и не содержат цифр', () => {
  const config = JSON.parse(
    readFileSync('content/narration/elevenlabs.json', 'utf8'),
  ) as {
    cases: Record<
      string,
      { speech: Record<string, { text: string; say: string }> }
    >;
  };
  const manifest = JSON.parse(
    readFileSync('public/cases/' + c.id + '/audio/manifest.json', 'utf8'),
  ) as { clips: { id: string; text: string }[] };
  const speech = config.cases[c.id]?.speech;
  expect(Object.keys(speech ?? {})).toHaveLength(9);
  for (const clip of manifest.clips) {
    expect(speech?.[clip.id]?.text).toBe(clip.text);
    expect(speech?.[clip.id]?.say).not.toMatch(/\d/u);
  }
});

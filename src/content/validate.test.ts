/** Регрессия пилота и намеренно повреждённых ссылок/достижимости. */
import { it, expect } from 'vitest';
import { pilot } from './loader';
import { caseSchema } from './schema';
import { validateCase } from './validate';
it('встроенное дело валидно и решаемо без сети', () => {
  expect(validateCase(pilot).errors).toEqual([]);
  expect(pilot.facts).toHaveLength(28);
  expect(pilot.clues).toHaveLength(12);
});
it('невалидный формат отвергается', () =>
  expect(caseSchema.safeParse({ ...pilot, schemaVersion: 4 }).success).toBe(
    false,
  ));
it('повреждённые ссылки и недостижимый сейф обнаруживаются', () => {
  const c = structuredClone(pilot);
  c.solution.culpritId = 'missing';
  c.facts.push({
    id: 'unreachable-key',
    text: 'Недостижимый факт',
    importance: 'key',
  });
  expect(validateCase(c).errors.length).toBeGreaterThan(1);
});

it('v1 без осмотра читается, v1 с новыми правилами и повреждённые детали отвергаются', () => {
  const legacy = structuredClone(pilot);
  legacy.schemaVersion = 1;
  legacy.players.max = 4;
  expect(caseSchema.safeParse(legacy).success).toBe(false);
  for (const cl of legacy.clues) {
    delete cl.inspection;
    delete cl.explanationFactIds;
  }
  for (const l of legacy.locations)
    for (const h of l.hotspots) {
      delete h.lock;
      delete h.container;
    }
  expect(caseSchema.safeParse(legacy).success).toBe(true);
  const broken = structuredClone(pilot);
  const inspection = broken.clues.find(
    (c) => c.id === 'c-statuette',
  )?.inspection;
  if (!inspection?.details[0]) throw Error('detail');
  inspection.details[0].rect.x = 0.99;
  expect(caseSchema.safeParse(broken).success).toBe(false);
});
it('ранний факт, ранний текст и недостижимый факт детали обнаруживаются', () => {
  const broken = structuredClone(pilot);
  const cl = broken.clues.find((c) => c.id === 'c-statuette');
  if (!cl?.inspection?.details[0]) throw Error('detail');
  cl.revealsFactIds = ['f-statuette-weapon'];
  cl.description = 'На подставке свежий скол.';
  expect(validateCase(broken).errors).toContain(
    'inspection fact opens early f-statuette-weapon',
  );
  expect(validateCase(broken).errors).toContain(
    'inspection text leak d-statuette-chip',
  );
  cl.revealsFactIds = [];
  cl.description = 'Награда.';
  cl.inspection.details[0].revealsFactIds = [];
  expect(validateCase(broken).errors).toContain(
    'unreachable f-statuette-weapon',
  );
});

it('отклоняет сломанную пунктуацию, сохраняя каноническое вопросительное многоточие', () => {
  for (const text of ['Ответ; Следующее предложение', 'Что?.']) {
    const copy = structuredClone(pilot);
    const q = copy.suspects[0]?.offlineQA[0];
    if (!q) throw new Error('Missing pilot question');
    q.answer = text;
    expect(
      validateCase(copy).errors.some((e) => e.startsWith('punctuation')),
    ).toBe(true);
  }
});

it('документ не повторяет факт даже с изменённым регистром и пробелами; связь afterBreak локальная', () => {
  const copy = structuredClone(pilot);
  const clue = copy.clues.find((c) => c.document);
  const fact = copy.facts[0];
  if (!clue?.document || !fact) throw new Error('fixture');
  clue.document.fields = { text: '  ' + fact.text.toUpperCase() + '  ' };
  expect(validateCase(copy).errors).toContain(
    'document repeats fact ' + clue.id,
  );
  const question = copy.suspects[0]?.offlineQA[0];
  if (!question) throw new Error('fixture');
  question.afterBreak = { truthId: 't-missing', answer: 'Правда.' };
  expect(validateCase(copy).errors).toContain('missing reference t-missing');
});

it('самостоятельная дедукция сейфа требует ОБА источника, а не OR', () => {
  for (const missing of ['f-safe-hint', 'f-opening-date']) {
    const c = structuredClone(pilot);
    for (const clue of c.clues)
      clue.revealsFactIds = clue.revealsFactIds.filter((id) => id !== missing);
    const report = validateCase(c);
    expect(report.reached.includes('c-ledger')).toBe(false);
    expect(report.errors).toContain('unreachable c-ledger');
  }
  const bad = structuredClone(pilot);
  const safe = bad.locations
    .flatMap((l) => l.hotspots)
    .find((h) => h.id === 'h-safe');
  if (!safe?.lock) throw new Error('fixture');
  safe.lock.deductionFactIds = ['f-safe-hint'];
  expect(validateCase(bad).errors).toContain(
    'safe deduction requires hint and date',
  );
});

it('новый формат не маскируется под v2, повреждённые код/область и недостижимое объяснение отвергаются', () => {
  expect(caseSchema.safeParse({ ...pilot, schemaVersion: 2 }).success).toBe(
    false,
  );
  const copy = structuredClone(pilot);
  const h = copy.locations.flatMap((l) => l.hotspots).find((h) => h.lock);
  if (!h?.lock || !h.container?.items[0]) throw new Error('fixture');
  h.lock.code = '14';
  expect(caseSchema.safeParse(copy).success).toBe(false);
  h.lock.code = '1408';
  h.container.items[0].rect.x = 0.99;
  expect(caseSchema.safeParse(copy).success).toBe(false);
  const unreachable = structuredClone(pilot);
  for (const suspect of unreachable.suspects)
    for (const breakpoint of suspect.breakpoints)
      breakpoint.revealsFactIds = breakpoint.revealsFactIds.filter(
        (id) => id !== 'f-olga-hotel',
      );
  expect(validateCase(unreachable).errors).toContain(
    'unreachable explanation f-olga-hotel',
  );
});

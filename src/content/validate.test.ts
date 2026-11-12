/** Регрессия пилота и намеренно повреждённых ссылок/достижимости. */
import { it, expect } from 'vitest';
import { pilot } from './loader';
import { caseSchema } from './schema';
import { validateCase } from './validate';
it('встроенное дело валидно и решаемо без сети', () => {
  expect(validateCase(pilot).errors).toEqual([]);
  expect(pilot.facts).toHaveLength(23);
  expect(pilot.clues).toHaveLength(9);
});
it('невалидный формат отвергается', () =>
  expect(caseSchema.safeParse({ ...pilot, schemaVersion: 3 }).success).toBe(
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
  for (const cl of legacy.clues) delete cl.inspection;
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

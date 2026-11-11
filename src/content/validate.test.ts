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
  expect(caseSchema.safeParse({ ...pilot, schemaVersion: 2 }).success).toBe(
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

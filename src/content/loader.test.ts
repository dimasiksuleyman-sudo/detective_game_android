/** Реестр отвергает неизвестные id и неоднозначный контент вместо тихой подмены дела. */
import { expect, it } from 'vitest';
import data from '../../public/cases/case-001-blue-owl/case.json';
import mini from '../../tests/fixtures/cases/case-e2e-mini/case.json';
import { createCaseRegistry, listCases, loadCase } from './loader';
it('список и загрузка выбирают точное встроенное дело', () => {
  const registry = createCaseRegistry({
    [`/cases/${data.id}/case.json`]: data,
    [`/cases/${mini.id}/case.json`]: mini,
  });
  expect(registry.list().map((c) => c.id)).toEqual([data.id, mini.id]);
  expect(registry.load(mini.id).title).toBe(mini.title);
  expect(() => registry.load('missing')).toThrow('Unknown case');
  expect(listCases().map((c) => c.id)).toEqual([data.id]);
  expect(loadCase(data.id).title).toBe(data.title);
});
it('неверная схема, дубликат и несовпадение каталога отвергаются', () => {
  expect(() => createCaseRegistry({ '/cases/bad/case.json': {} })).toThrow();
  expect(() => createCaseRegistry({ '/cases/wrong/case.json': data })).toThrow(
    'mismatch',
  );
  expect(() =>
    createCaseRegistry({
      [`/a/${data.id}/case.json`]: data,
      [`/b/${data.id}/case.json`]: data,
    }),
  ).toThrow('Duplicate');
});

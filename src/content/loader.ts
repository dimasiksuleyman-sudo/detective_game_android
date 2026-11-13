/** Реестр встроенных дел из public/cases; загрузка по id без сети и запасного пилота. */
import { caseSchema, type CaseFile } from './schema';
export const legacyCaseId = 'case-001-blue-owl';
export function createCaseRegistry(sources: Record<string, unknown>) {
  const cases = new Map<string, CaseFile>();
  for (const [path, source] of Object.entries(sources)) {
    const c = caseSchema.parse(source);
    if (!path.endsWith(`/${c.id}/case.json`))
      throw new Error(`Case path mismatch: ${path}`);
    if (cases.has(c.id)) throw new Error(`Duplicate case: ${c.id}`);
    cases.set(c.id, c);
  }
  return {
    list: () => [...cases.values()],
    load: (id: string) => {
      const c = cases.get(id);
      if (!c) throw new Error(`Unknown case: ${id}`);
      return c;
    },
  };
}
const testSources =
  import.meta.env.MODE === 'e2e'
    ? import.meta.glob('../../tests/fixtures/cases/*/case.json', {
        eager: true,
        import: 'default',
      })
    : {};
const registry = createCaseRegistry({
  ...import.meta.glob('../../public/cases/*/case.json', {
    eager: true,
    import: 'default',
  }),
  ...testSources,
});
export const listCases = () => registry.list();
export const loadCase = (id: string) => registry.load(id);

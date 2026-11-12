/** Факты и термины неоткрытых деталей: одни ограничения для движка и ИИ. Не отправляется в модель. */
import type { CaseFile } from './schema';
import type { Player } from '../game/engine';
export function hiddenInspectionDetails(c: CaseFile, p: Player) {
  return c.clues
    .flatMap((cl) => cl.inspection?.details ?? [])
    .filter((d) => !(p.inspectedDetails ?? []).includes(d.id));
}
export function hiddenInspectionFactIds(c: CaseFile, p: Player) {
  return hiddenInspectionDetails(c, p).flatMap((d) => d.revealsFactIds);
}
/** Целые слова/фразы: «скол» не должен срабатывать внутри «сколько» или «насколько». */
export function mentionsConcealedTerm(text: string, terms: string[]) {
  const normalize = (value: string) =>
    value
      .normalize('NFKC')
      .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ');
  const value = normalize(text);
  return terms.some((term) => {
    const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      '(?:^|[^\\p{L}\\p{N}])' + escaped + '(?=$|[^\\p{L}\\p{N}])',
      'u',
    ).test(value);
  });
}

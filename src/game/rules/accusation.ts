/**
 * Правила обвинения: один источник для движка и для экрана с объяснением итога.
 * Экран говорит игроку, ЧТО произошло (выбыл / предупреждение / записано),
 * но не говорит, какая часть версии неверна — иначе остальные узнают ответ.
 */
import type { CaseFile } from '../../content/schema';
import type { GameState, Player } from '../engine';

export type Accusation = {
  suspectId: string;
  motiveId: string;
  methodId: string;
  evidence: string[];
};
/** Сколько улик/фактов можно приложить: по одной на звено цепочки и две про запас. */
export const evidenceLimit = (c: CaseFile) =>
  (c.solution.proofChain?.length ?? 1) + 2;
/**
 * Верна ли тройка виновный/мотив/способ и доказана ли она. С цепочкой (v4, ADR-035)
 * нужно закрыть каждое звено; без неё — хватает одной улики из keyEvidence.
 * missing — подписи незакрытых звеньев: показываются только тому, чья тройка верна.
 */
export function judgeAccusation(c: CaseFile, a: Accusation) {
  const chain = c.solution.proofChain;
  const missing = chain
    ? chain
        .filter(
          (link) => !link.evidenceIds.some((id) => a.evidence.includes(id)),
        )
        .map((link) => link.label)
    : [];
  return {
    correct:
      a.suspectId === c.solution.culpritId &&
      a.motiveId === c.solution.motiveId &&
      a.methodId === c.solution.methodId,
    proven: chain
      ? missing.length === 0
      : a.evidence.some((id) => c.solution.keyEvidence.includes(id)),
    missing,
  };
}
/**
 * win — дело раскрыто; grace — версия верна, но без ключевой улики (один раз за игру);
 * eliminated — неверно, игрок выбывает; recorded — финальное обвинение: итог всем
 * сразу в конце, чтобы следующие игроки не узнали ответ по реакции первого.
 */
export type AccusationOutcome = 'win' | 'grace' | 'eliminated' | 'recorded';

export function accusationOutcome(
  c: CaseFile,
  s: GameState,
  p: Player,
  a: Accusation,
): AccusationOutcome {
  if (s.finalMode) return 'recorded';
  const { correct, proven } = judgeAccusation(c, a);
  if (correct && proven) return 'win';
  if (correct && !p.grace) return 'grace';
  return 'eliminated';
}

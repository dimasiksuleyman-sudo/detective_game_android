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
/** Верна ли тройка виновный/мотив/способ и есть ли среди доказательств ключевая улика. */
export function judgeAccusation(c: CaseFile, a: Accusation) {
  return {
    correct:
      a.suspectId === c.solution.culpritId &&
      a.motiveId === c.solution.motiveId &&
      a.methodId === c.solution.methodId,
    proven: a.evidence.some((id) => c.solution.keyEvidence.includes(id)),
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

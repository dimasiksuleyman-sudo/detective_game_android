/**
 * Правила обвинения (ADR-036): один источник для движка и для экрана с объяснением итога.
 * Экран говорит игроку, ЧТО произошло (принято / выбыл / предупреждение / записано),
 * но не говорит, какая часть версии неверна — иначе остальные узнают ответ.
 */
import type { CaseFile } from '../../content/schema';
import type { GameState, Player } from '../engine';
import { keyEvidenceIds } from './scoring';

export type Accusation = {
  suspectId: string;
  motiveId: string;
  methodId: string;
  evidence: string[];
};

/**
 * accepted — верны убийца и мотив и есть хотя бы одна ключевая улика.
 * missing — подписи звеньев цепочки, которые можно было бы ещё закрыть (подсказка
 * для очков); показываются только тому, чьи убийца и мотив верны.
 */
export function judgeAccusation(c: CaseFile, a: Accusation) {
  const keys = keyEvidenceIds(c);
  const keyCount = a.evidence.filter((id) => keys.has(id)).length;
  const culpritAndMotive =
    a.suspectId === c.solution.culpritId && a.motiveId === c.solution.motiveId;
  const missing = (c.solution.proofChain ?? [])
    .filter((link) => !link.evidenceIds.some((id) => a.evidence.includes(id)))
    .map((link) => link.label);
  return {
    culpritAndMotive,
    keyCount,
    accepted: culpritAndMotive && keyCount > 0,
    missing,
  };
}
/**
 * accepted — прокурор принял дело (очки начислены, игрок закончил расследование);
 * grace — убийца и мотив верны, но нет ни одной ключевой улики (один раз за игру);
 * eliminated — неверно, игрок выбывает; recorded — финальное обвинение: итог всем
 * сразу в конце, чтобы следующие игроки не узнали ответ по реакции первого.
 */
export type AccusationOutcome =
  'accepted' | 'grace' | 'eliminated' | 'recorded';

export function accusationOutcome(
  c: CaseFile,
  s: GameState,
  p: Player,
  a: Accusation,
): AccusationOutcome {
  if (s.finalMode) return 'recorded';
  const j = judgeAccusation(c, a);
  if (j.accepted) return 'accepted';
  if (j.culpritAndMotive && !p.grace) return 'grace';
  return 'eliminated';
}

/**
 * Очки за обвинение (ADR-036). Игра соревновательная: дело может раскрыть каждый,
 * побеждает тот, кто раскрыл лучше всех. Чистые функции — общие для движка и экранов.
 *
 * Дело принято, если верны убийца и мотив и приложена хотя бы одна ключевая улика
 * (как у настоящего прокурора — признание не обязательно). Дальше очки растут:
 * верный способ, каждая следующая ключевая улика, скорость; признание виновного
 * удваивает всю сумму.
 */
import type { CaseFile } from '../../content/schema';

export const SCORE = {
  base: 10,
  method: 5,
  perEvidence: 3,
  maxExtraEvidence: 5,
  perUnusedRound: 1,
  confessionMultiplier: 2,
} as const;
/** Сколько улик/фактов можно приложить: одна для принятия дела и пять за очки. */
export const EVIDENCE_LIMIT = 1 + SCORE.maxExtraEvidence;
/** Стресс, при котором виновный ломается, даже если показали не все нужные находки. */
export const PRESSURE_STRESS = 9;

/** Ключевые доказательства: keyEvidence дела и все звенья цепочки (ADR-035). */
export function keyEvidenceIds(c: CaseFile) {
  return new Set([
    ...c.solution.keyEvidence,
    ...(c.solution.proofChain ?? []).flatMap((l) => l.evidenceIds),
  ]);
}

/**
 * Признание виновного: звено цепочки, состоящее только из фактов его брейкпоинтов
 * (валидатор требует такое звено). Без цепочки — факты последнего брейкпоинта.
 */
export function confessionIds(c: CaseFile) {
  const culprit = c.suspects.find((s) => s.id === c.solution.culpritId);
  const confessed = new Set(
    culprit?.breakpoints.flatMap((b) => b.revealsFactIds) ?? [],
  );
  const links = (c.solution.proofChain ?? []).filter(
    (l) =>
      l.evidenceIds.length && l.evidenceIds.every((id) => confessed.has(id)),
  );
  if (links.length) return new Set(links.flatMap((l) => l.evidenceIds));
  return new Set(culprit?.breakpoints.at(-1)?.revealsFactIds ?? []);
}

export type ScoreBreakdown = {
  base: number;
  method: number;
  evidence: number;
  speed: number;
  confession: boolean;
  total: number;
};

/** Очки принятого обвинения. Скорость — +1 за каждый неиспользованный раунд, в финале 0. */
export function scoreAccusation(
  c: CaseFile,
  a: { methodId: string; evidence: string[] },
  t: { round: number; roundLimit: number; finalMode: boolean },
): ScoreBreakdown {
  const keys = keyEvidenceIds(c);
  const keyCount = a.evidence.filter((id) => keys.has(id)).length;
  const method = a.methodId === c.solution.methodId ? SCORE.method : 0;
  const evidence =
    SCORE.perEvidence *
    Math.min(Math.max(0, keyCount - 1), SCORE.maxExtraEvidence);
  const speed = t.finalMode
    ? 0
    : SCORE.perUnusedRound * Math.max(0, t.roundLimit - t.round);
  const conf = confessionIds(c);
  const confession = a.evidence.some((id) => conf.has(id));
  const sum = SCORE.base + method + evidence + speed;
  return {
    base: SCORE.base,
    method,
    evidence,
    speed,
    confession,
    total: confession ? sum * SCORE.confessionMultiplier : sum,
  };
}

/**
 * Максимум, который ещё можно набрать в этом раунде (ADR-036): верный способ, все
 * дополнительные улики, скорость и признание. Показывается игроку — куда стремиться.
 */
export function maxScore(t: {
  round: number;
  roundLimit: number;
  finalMode: boolean;
}) {
  const speed = t.finalMode
    ? 0
    : SCORE.perUnusedRound * Math.max(0, t.roundLimit - t.round);
  return (
    (SCORE.base +
      SCORE.method +
      SCORE.perEvidence * SCORE.maxExtraEvidence +
      speed) *
    SCORE.confessionMultiplier
  );
}

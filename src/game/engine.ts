/** Чистый детерминированный движок: все права, лимиты и открытия проверяются здесь. */
import { hiddenInspectionFactIds } from '../content/inspectionKnowledge';
import { ru } from '../i18n/ru';
import type { CaseFile } from '../content/schema';
import { judgeAccusation } from './rules/accusation';
import { TALK_LIMIT, TURN_SECONDS, type TurnSeconds } from './rules/turn';
export type Emotion =
  'neutral' | 'nervous' | 'angry' | 'sad' | 'smug' | 'broken';
export type Tone = 'neutral' | 'pressure' | 'empathy';
export type AiUsage = {
  knownCostRub: number;
  unknownCost: boolean;
  lastCostRub: number | null;
  balance: number | null;
  attempts: number;
};
export const emptyAiUsage: AiUsage = {
  knownCostRub: 0,
  unknownCost: false,
  lastCostRub: null,
  balance: null,
  attempts: 0,
};
export type Player = {
  name: string;
  color: string;
  clues: string[];
  inspectedDetails: string[];
  openedLocks: string[];
  facts: string[];
  visited: string[];
  asked: string[];
  truths: string[];
  broken: string[];
  notes: string;
  stress: Record<string, number>;
  emotions: Record<string, Emotion>;
  blocked: Record<string, number>;
  turns: number;
  eliminated: boolean;
  grace: boolean;
  score: number;
  history: { suspect: string; question: string; answer: string }[];
};
export type GameState = {
  caseId: string;
  aiUsage: AiUsage;
  mode: 'classic' | 'ai';
  players: Player[];
  current: number;
  round: number;
  roundLimit: number;
  /** Режим блиц: секунды на ход, 0 — без ограничения (ADR-034). Время считает экран, не движок. */
  turnSeconds: TurnSeconds;
  phase: 'briefing' | 'handover' | 'turn' | 'final' | 'finished';
  finalMode: boolean;
  finalDone: number[];
  winners: number[];
  action: { kind: 'search' | 'talk'; target: string; used: number } | null;
  board: { id: string; by: number }[];
  message: string;
  hint: string;
  started: boolean;
};
export type Action =
  | {
      type: 'START_GAME';
      caseId?: string;
      names: string[];
      roundLimit: number;
      turnSeconds?: TurnSeconds;
      mode?: 'classic' | 'ai';
      overwrite?: boolean;
    }
  | { type: 'RECORD_AI_USAGE'; usage: AiUsage }
  | { type: 'BEGIN_TURN' }
  | { type: 'OPEN_LOCK'; locationId: string; hotspotId: string; code: string }
  | { type: 'TAKE_CONTAINER_ITEM'; hotspotId: string; clueId: string }
  | { type: 'END_TURN' }
  | { type: 'INSPECT_CLUE'; clueId: string; x: number; y: number }
  | { type: 'SEARCH_HOTSPOT'; locationId: string; hotspotId: string }
  | {
      type: 'ASK_OFFLINE_QUESTION';
      suspectId: string;
      questionId: string;
      tone: Tone;
    }
  | {
      type: 'PRESENT_CLUE';
      suspectId: string;
      clueId: string;
      tone: Tone;
      aiReply?: string;
      aiEmotion?: Emotion;
    }
  | {
      type: 'ASK_AI_QUESTION_RESULT';
      question?: string;
      emotion?: Emotion;
      suspectId: string;
      reply: string;
      factIds: string[];
      stressDelta: number;
      tone: Tone;
      valid: boolean;
    }
  | { type: 'PUBLISH_TO_BOARD'; id: string }
  | { type: 'ADD_NOTE'; text: string }
  | {
      type: 'ACCUSE';
      suspectId: string;
      motiveId: string;
      methodId: string;
      evidence: string[];
    }
  | { type: 'SET_INPUT_MODE'; mode: 'classic' | 'ai' }
  | { type: 'LOCK' };
const unique = (a: string[]) => [...new Set(a)];
const colors = ['#D2691E', '#52b6b6', '#bc6575', '#d6b644', '#a58cdb'];
function grant(c: CaseFile, p: Player, clues: string[], facts: string[]) {
  for (const id of clues) {
    if (!p.clues.includes(id) && c.clues.find((x) => x.id === id)?.isKey)
      p.score += 2;
  }
  p.clues = unique([...p.clues, ...clues]);
  const hiddenFacts = hiddenInspectionFactIds(c, p);
  p.facts = unique([
    ...p.facts,
    ...[
      ...facts,
      ...c.clues
        .filter((x) => clues.includes(x.id))
        .flatMap((x) => x.revealsFactIds),
    ].filter((id) => !hiddenFacts.includes(id)),
  ]);
}
function begin(c: CaseFile, s: GameState) {
  const p = s.players[s.current];
  if (!p) return;
  s.action = null;
  s.message = '';
  p.turns++;
  for (const suspect of c.suspects) {
    const until = p.blocked[suspect.id];
    if (until !== undefined && p.turns > until) {
      p.stress[suspect.id] = 6;
      p.blocked = Object.fromEntries(
        Object.entries(p.blocked).filter(([id]) => id !== suspect.id),
      );
    } else p.stress[suspect.id] = Math.max(0, (p.stress[suspect.id] ?? 0) - 1);
  }
  s.hint = c.hints
    .filter(
      (h) =>
        s.round >= h.afterRound &&
        !s.players.some(
          (x) =>
            x.clues.includes(h.unlessAnyPlayerHas) ||
            x.facts.includes(h.unlessAnyPlayerHas),
        ),
    )
    .map((h) => h.text)
    .join(' ');
  s.started = true;
  s.phase =
    s.players.length === 1 ? (s.finalMode ? 'final' : 'turn') : 'handover';
}
function next(c: CaseFile, s: GameState) {
  const active = s.players
    .map((p, i) => (p.eliminated ? -1 : i))
    .filter((i) => i >= 0);
  if (!active.length) {
    s.phase = 'finished';
    return;
  }
  if (s.finalMode) {
    const n = active.find((i) => !s.finalDone.includes(i));
    if (n === undefined) {
      s.phase = 'finished';
      return;
    }
    s.current = n;
    begin(c, s);
    return;
  }
  let n = (s.current + 1) % s.players.length;
  if (n === 0) s.round++;
  while (s.players[n]?.eliminated) {
    n = (n + 1) % s.players.length;
    if (n === 0) s.round++;
  }
  s.current = n;
  if (s.round > s.roundLimit) {
    s.finalMode = true;
    s.current = active[0] ?? 0;
  }
  begin(c, s);
}
function canUse(
  s: GameState,
  p: Player,
  kind: 'search' | 'talk',
  target: string,
  limit: number,
) {
  return (
    !s.finalMode &&
    !p.eliminated &&
    (!s.action ||
      (s.action.kind === kind &&
        s.action.target === target &&
        s.action.used < limit))
  );
}
function use(s: GameState, kind: 'search' | 'talk', target: string) {
  s.action = { kind, target, used: (s.action?.used ?? 0) + 1 };
}
function stress(p: Player, id: string, delta: number) {
  p.stress[id] = Math.min(10, Math.max(0, (p.stress[id] ?? 0) + delta));
  if (p.stress[id] === 10) p.blocked[id] = p.turns + 1;
}
const toneDelta = (t: Tone) =>
  t === 'pressure' ? 2 : t === 'empathy' ? -1 : 0;
export function reduce(
  c: CaseFile,
  state: GameState | null,
  a: Action,
): GameState | null {
  if (a.type === 'START_GAME') {
    if (state && !a.overwrite) return state;
    if (
      a.names.length < 1 ||
      a.names.length > 5 ||
      ![6, 8, 10].includes(a.roundLimit) ||
      !TURN_SECONDS.includes(a.turnSeconds ?? 0) ||
      a.names.some((x) => !x.trim() || x.length > 30)
    )
      return state;
    return {
      caseId: c.id,
      aiUsage: { ...emptyAiUsage },
      mode: a.mode ?? 'classic',
      players: a.names.map((name, i) => ({
        name: name.trim(),
        color: colors[i] ?? colors[0] ?? '',
        clues: [],
        inspectedDetails: [],
        openedLocks: [],
        facts: [],
        visited: [],
        asked: [],
        truths: [],
        broken: [],
        notes: '',
        stress: {},
        emotions: {},
        blocked: {},
        turns: 0,
        eliminated: false,
        grace: false,
        score: 0,
        history: [],
      })),
      current: 0,
      round: 1,
      roundLimit: a.roundLimit,
      turnSeconds: a.turnSeconds ?? 0,
      phase: 'briefing',
      finalMode: false,
      finalDone: [],
      winners: [],
      action: null,
      board: [],
      message: '',
      hint: '',
      started: false,
    };
  }
  if (!state) return null;
  const s = structuredClone(state),
    p = s.players[s.current];
  if (!p) return state;
  if (a.type === 'RECORD_AI_USAGE') {
    if (
      ![
        a.usage.knownCostRub,
        a.usage.attempts,
        a.usage.lastCostRub ?? 0,
        a.usage.balance ?? 0,
      ].every((n) => Number.isFinite(n) && n >= 0)
    )
      return state;
    s.aiUsage = {
      ...a.usage,
      knownCostRub: s.aiUsage.knownCostRub + a.usage.knownCostRub,
      attempts: s.aiUsage.attempts + a.usage.attempts,
      unknownCost: s.aiUsage.unknownCost || a.usage.unknownCost,
    };
    return s;
  }
  if (a.type === 'SET_INPUT_MODE') {
    s.mode = a.mode;
    return s;
  }
  if (a.type === 'LOCK') {
    if (s.phase === 'turn' || s.phase === 'final') s.phase = 'handover';
    return s;
  }
  if (a.type === 'BEGIN_TURN') {
    if (s.phase === 'briefing') begin(c, s);
    else if (s.phase === 'handover') s.phase = s.finalMode ? 'final' : 'turn';
    return s;
  }
  if (!['turn', 'final'].includes(s.phase)) return state;
  s.message = '';
  if (a.type === 'END_TURN') {
    if (!s.finalMode) next(c, s);
    return s;
  }
  if (a.type === 'ADD_NOTE') {
    p.notes = a.text.slice(0, 5000);
    return s;
  }
  if (a.type === 'PUBLISH_TO_BOARD') {
    if (
      (p.clues.includes(a.id) || p.facts.includes(a.id)) &&
      !s.board.some((x) => x.id === a.id)
    ) {
      s.board.push({ id: a.id, by: s.current });
      p.score++;
    }
    return s;
  }
  if (a.type === 'INSPECT_CLUE') {
    if (
      s.finalMode ||
      p.eliminated ||
      !p.clues.includes(a.clueId) ||
      !Number.isFinite(a.x) ||
      !Number.isFinite(a.y)
    )
      return state;
    const detail = c.clues
      .find((cl) => cl.id === a.clueId)
      ?.inspection?.details.find(
        (d) =>
          a.x >= d.rect.x &&
          a.x <= d.rect.x + d.rect.w &&
          a.y >= d.rect.y &&
          a.y <= d.rect.y + d.rect.h,
      );
    if (!detail || p.inspectedDetails.includes(detail.id)) return state;
    p.inspectedDetails.push(detail.id);
    grant(c, p, [], detail.revealsFactIds);
    s.message = ru.inspection.found;
    return s;
  }
  if (a.type === 'OPEN_LOCK') {
    if (s.finalMode || p.eliminated) return state;
    const loc = c.locations.find((l) => l.id === a.locationId);
    const h = loc?.hotspots.find((h) => h.id === a.hotspotId);
    if (!h?.lock || !h.container) return state;
    if (p.openedLocks.includes(h.id)) return state;
    if (!canUse(s, p, 'search', a.locationId, Infinity)) return state;
    if (a.code !== h.lock.code) {
      s.message = ru.safe.wrong;
      return s;
    }
    use(s, 'search', a.locationId);
    p.openedLocks.push(h.id);
    p.visited = unique([...p.visited, h.id]);
    s.message = ru.safe.opened;
    return s;
  }
  if (a.type === 'TAKE_CONTAINER_ITEM') {
    if (s.finalMode || p.eliminated) return state;
    const h = c.locations
      .flatMap((l) => l.hotspots)
      .find((h) => h.id === a.hotspotId);
    if (
      !h?.container ||
      !p.openedLocks.includes(h.id) ||
      !h.container.items.some((i) => i.clueId === a.clueId) ||
      p.clues.includes(a.clueId)
    )
      return state;
    grant(c, p, [a.clueId], []);
    return s;
  }
  if (a.type === 'SEARCH_HOTSPOT') {
    const l = c.locations.find((x) => x.id === a.locationId),
      h = l?.hotspots.find((x) => x.id === a.hotspotId);
    if (
      !h ||
      h.lock ||
      !canUse(s, p, 'search', a.locationId, Infinity) ||
      p.visited.includes(h.id)
    )
      return state;
    if (h.requiresFactId && !p.facts.includes(h.requiresFactId)) {
      s.message = h.lockedText ?? '';
      return s;
    }
    use(s, 'search', a.locationId);
    p.visited.push(h.id);
    grant(c, p, h.clueId ? [h.clueId] : [], h.revealsFactIds ?? []);
    s.message = h.text;
    return s;
  }
  if (
    a.type === 'ASK_OFFLINE_QUESTION' ||
    a.type === 'PRESENT_CLUE' ||
    a.type === 'ASK_AI_QUESTION_RESULT'
  ) {
    const suspect = c.suspects.find((x) => x.id === a.suspectId);
    if (
      !suspect ||
      !canUse(s, p, 'talk', a.suspectId, TALK_LIMIT) ||
      p.blocked[a.suspectId] !== undefined
    )
      return state;
    let answer: string,
      question: string,
      delta = toneDelta(a.tone);
    if (a.type === 'ASK_OFFLINE_QUESTION') {
      const q = suspect.offlineQA.find((x) => x.id === a.questionId);
      if (
        !q ||
        p.asked.includes(q.id) ||
        (q.requiresClueId && !p.clues.includes(q.requiresClueId)) ||
        (q.requiresFactId && !p.facts.includes(q.requiresFactId))
      )
        return state;
      p.asked.push(q.id);
      grant(c, p, [], q.revealsFactIds);
      answer =
        q.afterBreak && p.truths.includes(q.afterBreak.truthId)
          ? q.afterBreak.answer
          : q.answer;
      question = q.question;
      delta += q.stressDelta ?? 0;
    } else if (a.type === 'PRESENT_CLUE') {
      if (!p.clues.includes(a.clueId)) return state;
      question = c.clues.find((x) => x.id === a.clueId)?.name ?? '';
      const bp = suspect.breakpoints.find(
        (x) =>
          x.clueId === a.clueId &&
          (x.requiresFactIds ?? []).every((id) => p.facts.includes(id)),
      );
      // Порог проверяем до изменения стресса этой репликой; иначе тон менял бы исход задним числом.
      if (bp && !bp.unlocksTruthIds.every((id) => p.truths.includes(id))) {
        if (
          bp.ignoreStress ||
          (p.stress[suspect.id] ?? 0) >= suspect.breakThreshold
        ) {
          p.truths = unique([...p.truths, ...bp.unlocksTruthIds]);
          grant(c, p, [], bp.revealsFactIds);
          answer = bp.confession;
          if (!p.broken.includes(suspect.id)) {
            p.broken.push(suspect.id);
            p.score++;
          }
        } else {
          delta += 2;
          answer = ru.game.nervous;
        }
      } else
        answer =
          suspect.clueReactions.find((x) => x.clueId === a.clueId)?.reaction ??
          ru.game.neutralReaction;
    } else {
      if (!a.valid) return state;
      const allowed = unique([
        ...suspect.shareableFactIds,
        ...suspect.breakpoints
          .filter((b) => b.unlocksTruthIds.every((id) => p.truths.includes(id)))
          .flatMap((b) => b.revealsFactIds),
      ]);
      grant(
        c,
        p,
        [],
        a.factIds.filter((id) => allowed.includes(id)),
      );
      answer = a.reply;
      question = a.question ?? '';
      delta += Math.min(
        2,
        Math.max(-1, Number.isFinite(a.stressDelta) ? a.stressDelta : 0),
      );
    }
    if (a.type === 'PRESENT_CLUE' && a.aiReply) answer = a.aiReply;
    use(s, 'talk', a.suspectId);
    stress(p, suspect.id, delta);
    const emotion =
      a.type === 'ASK_AI_QUESTION_RESULT'
        ? a.emotion
        : a.type === 'PRESENT_CLUE'
          ? a.aiEmotion
          : undefined;
    p.emotions[suspect.id] = p.broken.includes(suspect.id)
      ? 'broken'
      : emotion &&
          ['neutral', 'nervous', 'angry', 'sad', 'smug'].includes(emotion)
        ? emotion
        : (p.stress[suspect.id] ?? 0) >= 6
          ? 'nervous'
          : 'neutral';
    p.history.push({ suspect: suspect.id, question, answer });
    s.message = p.blocked[suspect.id] !== undefined ? ru.game.lawyer : answer;
    return s;
  }
  if (a.type === 'ACCUSE') {
    if (
      !c.suspects.some((x) => x.id === a.suspectId) ||
      !c.motives.some((x) => x.id === a.motiveId) ||
      !c.methods.some((x) => x.id === a.methodId) ||
      a.evidence.length > 3 ||
      unique(a.evidence).length !== a.evidence.length ||
      !a.evidence.every((id) => p.clues.includes(id) || p.facts.includes(id))
    )
      return state;
    const { correct, proven } = judgeAccusation(c, a);
    if (correct && proven) {
      p.score += 10;
      s.winners.push(s.current);
      if (!s.finalMode) {
        s.phase = 'finished';
        return s;
      }
    } else if (!s.finalMode && correct && !p.grace) {
      p.grace = true;
      s.message = ru.game.noEvidence;
      return s;
    } else if (!s.finalMode) p.eliminated = true;
    if (s.finalMode) s.finalDone.push(s.current);
    next(c, s);
    return s;
  }
  return state;
}

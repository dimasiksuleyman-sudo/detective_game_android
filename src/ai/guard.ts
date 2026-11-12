/** Эвристический пост-фильтр. Авторитетные факты берутся движком из канонического контента. */
import { mentionsConcealedTerm } from '../content/inspectionKnowledge';
import { parseResponse } from './responseParser';
export const emotions = [
  'neutral',
  'nervous',
  'angry',
  'sad',
  'smug',
  'broken',
] as const;
export type Emotion = (typeof emotions)[number];
export type GuardedReply = {
  reply: string;
  emotion: Emotion;
  factIds: string[];
  stressDelta: number;
  valid: boolean;
};
const fallback: GuardedReply = {
  reply: 'Я уже всё сказал. Спросите по-другому.',
  emotion: 'neutral',
  factIds: [],
  stressDelta: 0,
  valid: false,
};
export function guard(
  raw: string,
  allowedFactIds: string[],
  concealedTerms: string[] = [],
): GuardedReply {
  const parsed = parseResponse(raw);
  if (!parsed) return { ...fallback };
  const normalized = parsed.reply
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
    .toLowerCase()
    .replace(/ё/g, 'е');
  if (mentionsConcealedTerm(normalized, concealedTerms)) return { ...fallback };
  // Даже после брейкпоинта пилот раскрывает частичную правду, не полное признание в убийстве.
  if (
    /как\s+(?:ии|языковая модель)|language model|as an ai|языков[а-яa-z]*\s+модел|в\s+этой\s+игре|\bsystem\b|\bjson\b|я\s+убил[а]?(?![а-яa-z])|это\s+я\s+его|убийц|виновен|виновна|\bsk-[a-z0-9_-]{12,}|\bbearer\s/i.test(
      normalized,
    )
  )
    return { ...fallback };
  let reply = parsed.reply.trim();
  if (reply.length > 400) {
    const prefix = reply.slice(0, 400);
    const ends = [...prefix.matchAll(/[.!?](?:[»”"])?(?=\s|$)/g)];
    const last = ends.at(-1);
    if (last?.index === undefined) return { ...fallback };
    reply = prefix.slice(0, last.index + last[0].length);
  }
  const emotion = emotions.find((e) => e === parsed.emotion) ?? 'neutral';
  const delta =
    typeof parsed.stress_delta === 'number' &&
    Number.isFinite(parsed.stress_delta)
      ? Math.min(2, Math.max(-1, Math.trunc(parsed.stress_delta)))
      : 0;
  return {
    reply,
    emotion,
    factIds: [
      ...new Set(
        parsed.mentioned_fact_ids.filter((id) => allowedFactIds.includes(id)),
      ),
    ],
    stressDelta: delta,
    valid: true,
  };
}

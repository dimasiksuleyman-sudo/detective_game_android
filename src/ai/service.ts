/** Оркестрация повторов и guard без доступа к секрету; фолбэк не создаёт игровое действие. */
import { AiError, type AiClient } from './client';
import { buildSuspectPrompt } from './promptBuilder';
import { guard } from './guard';
import { FALLBACK_MODEL, type ModelId } from './config';
import type { CaseFile } from '../content/schema';
import type { Player, Tone } from '../game/engine';
import type { AiUsage } from '../game/engine';
export type { AiUsage };
export async function interrogate(args: {
  client: AiClient;
  c: CaseFile;
  suspectId: string;
  player: Player;
  tone: Tone;
  question: string;
  reaction?: string;
  model: ModelId;
  fallback: boolean;
  signal: AbortSignal;
}) {
  const prompt = buildSuspectPrompt(
    args.c,
    args.suspectId,
    args.player,
    args.tone,
    args.question,
    args.reaction,
  );
  const usage: AiUsage = {
    knownCostRub: 0,
    unknownCost: false,
    lastCostRub: null,
    balance: null,
    attempts: 0,
  };
  let error = 'invalid';
  const attempts = [
    args.model,
    args.model,
    ...(args.fallback && args.model !== FALLBACK_MODEL ? [FALLBACK_MODEL] : []),
  ];
  for (const [index, model] of attempts.entries()) {
    if (args.signal.aborted)
      return { result: guard('', []), usage, error: 'cancelled' };
    try {
      usage.attempts++;
      usage.lastCostRub = null;
      const response = await args.client.complete({
        messages: prompt.messages,
        model,
        signal: args.signal,
        ...(index === 1 ? { strictRetry: true } : {}),
      });
      usage.lastCostRub = response.costRub ?? null;
      usage.knownCostRub += response.costRub ?? 0;
      if (response.costRub === undefined) usage.unknownCost = true;
      if (response.balance !== undefined) usage.balance = response.balance;
      const result = guard(
        response.content,
        prompt.allowedFactIds,
        prompt.concealedTerms,
      );
      if (result.valid) return { result, usage, error: null };
      error = 'invalid';
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'network';
      error = code;
      usage.unknownCost = true;
      if (
        ['auth', 'balance', 'rate', 'configuration', 'cancelled'].includes(code)
      )
        break;
    }
  }
  return { result: guard('', []), usage, error };
}

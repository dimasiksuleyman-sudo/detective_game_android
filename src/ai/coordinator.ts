/** Применяет только актуальный результат к тому игроку/ходу, который начал запрос; ключ не сохраняется в партии. */
import { create } from 'zustand';
import { pilot } from '../content/loader';
import { useGame } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import { getAiClient } from './factory';
import { interrogate, type AiUsage } from './service';
import { reduce, type Tone } from '../game/engine';
import { ru } from '../i18n/ru';
let pending: AbortController | undefined;
const initialUsage: AiUsage = {
  knownCostRub: 0,
  unknownCost: false,
  lastCostRub: null,
  balance: null,
  attempts: 0,
};
export const useAi = create<{ busy: boolean; error: string; usage: AiUsage }>(
  () => ({ busy: false, error: '', usage: { ...initialUsage } }),
);
export function cancelAi() {
  pending?.abort();
}
export function resetAiUsage() {
  useAi.setState({ usage: { ...initialUsage }, error: '' });
}
export async function askAi(
  suspectId: string,
  question: string,
  tone: Tone,
  clueId?: string,
) {
  if (useAi.getState().busy || useGame.getState().busy) return;
  const original = useGame.getState().game;
  const settings = useSettings.getState();
  if (
    !original ||
    original.phase !== 'turn' ||
    original.mode !== 'ai' ||
    original.finalMode
  )
    return;
  const player = original.players[original.current];
  if (!player) return;
  if (!settings.hasKey) {
    useAi.setState({ error: ru.ai.noKey });
    return;
  }
  if (!clueId && (!question.trim() || question.length > 1000)) return;
  // Проверка до платного запроса использует тот же reduce, что и окончательное действие.
  const preview = clueId
    ? reduce(pilot, original, { type: 'PRESENT_CLUE', suspectId, clueId, tone })
    : reduce(pilot, original, {
        type: 'ASK_AI_QUESTION_RESULT',
        suspectId,
        reply: '',
        factIds: [],
        stressDelta: 0,
        tone,
        valid: true,
      });
  if (preview === original || !preview) return;
  const reaction = clueId
    ? preview.players[original.current]?.history.at(-1)?.answer
    : undefined;
  const label = clueId
    ? (pilot.clues.find((c) => c.id === clueId)?.name ?? '')
    : question.trim();
  const controller = new AbortController();
  pending = controller;
  useAi.setState({ busy: true, error: '' });
  try {
    const answer = await interrogate({
      client: getAiClient(),
      c: pilot,
      suspectId,
      player: clueId ? (preview.players[original.current] ?? player) : player,
      tone,
      question: label,
      ...(reaction ? { reaction } : {}),
      model: settings.model,
      fallback: settings.fallback,
      signal: controller.signal,
    });
    const old = useAi.getState().usage;
    useAi.setState({
      usage: {
        ...answer.usage,
        knownCostRub: old.knownCostRub + answer.usage.knownCostRub,
        unknownCost: old.unknownCost || answer.usage.unknownCost,
        attempts: old.attempts + answer.usage.attempts,
      },
    });
    if (answer.usage.balance !== null)
      useSettings.getState().setBalance(answer.usage.balance);
    const stillCurrent =
      !controller.signal.aborted && useGame.getState().game === original;
    if (useGame.getState().busy)
      await new Promise<void>((resolve) => {
        const unsubscribe = useGame.subscribe((s) => {
          if (!s.busy) {
            unsubscribe();
            resolve();
          }
        });
      });
    await useGame
      .getState()
      .dispatch({ type: 'RECORD_AI_USAGE', usage: answer.usage });
    if (!stillCurrent || useGame.getState().error) return;
    if (!answer.result.valid) {
      useAi.setState({
        error:
          ru.ai.errors[answer.error as keyof typeof ru.ai.errors] ??
          ru.ai.errors.invalid,
      });
      return;
    }
    if (clueId) {
      await useGame.getState().dispatch({
        type: 'PRESENT_CLUE',
        suspectId,
        clueId,
        tone,
        aiReply: answer.result.reply,
        aiEmotion: answer.result.emotion,
      });
    } else
      await useGame.getState().dispatch({
        type: 'ASK_AI_QUESTION_RESULT',
        suspectId,
        question: label,
        ...answer.result,
        tone,
      });
  } catch {
    useAi.setState({ error: ru.ai.errors.network });
  } finally {
    if (pending === controller) pending = undefined;
    useAi.setState({ busy: false });
  }
}

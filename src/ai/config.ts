/** Проверенные публичные API-id; окончательный выбор модели ждёт бенчмарка владельца. */
export const AI_BASE = 'https://api.aitunnel.ru/v1';
export const MODELS = [
  { id: 'qwen3.7-flash', schema: false },
  { id: 'deepseek-v4-flash', schema: true },
  { id: 'gemini-2.5-flash-lite', schema: true },
] as const;
export type ModelId = (typeof MODELS)[number]['id'];
export const DEFAULT_MODEL: ModelId = 'qwen3.7-flash';
export const FALLBACK_MODEL: ModelId = 'deepseek-v4-flash';
export const AI_TIMEOUT_MS = 20_000;
export const AI_REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    emotion: {
      type: 'string',
      enum: ['neutral', 'nervous', 'angry', 'sad', 'smug', 'broken'],
    },
    stress_delta: { type: 'integer', minimum: -1, maximum: 2 },
    mentioned_fact_ids: { type: 'array', items: { type: 'string' } },
  },
  required: ['reply', 'emotion', 'stress_delta', 'mentioned_fact_ids'],
  additionalProperties: false,
};

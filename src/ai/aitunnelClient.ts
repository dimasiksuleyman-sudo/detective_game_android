/** Прямой HTTPS-транспорт aitunnel; ключ не входит в промпт, исключения или сериализуемое состояние. */
import { z } from 'zod';
import { AI_BASE, AI_TIMEOUT_MS, MODELS, AI_REPLY_SCHEMA } from './config';
import { AiError, type AiClient, type CompletionRequest } from './client';
import { readApiKey } from '../platform/secureStorage';
import { redact } from './redact';
const number = (value: string | null) => {
  if (value === null || !value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
export function requestBody(r: CompletionRequest) {
  return {
    model: r.model,
    messages: r.strictRetry
      ? [
          ...r.messages,
          {
            role: 'user',
            content: 'Ответь строго одним JSON-объектом по указанной схеме.',
          },
        ]
      : r.messages,
    temperature: 0.8,
    max_tokens: 400,
    stream: false,
    reasoning: { enabled: false, effort: 'none' },
    response_format: MODELS.find((m) => m.id === r.model)?.schema
      ? {
          type: 'json_schema',
          json_schema: {
            name: 'suspect_reply',
            strict: true,
            schema: AI_REPLY_SCHEMA,
          },
        }
      : { type: 'json_object' },
  };
}
async function request(
  path: string,
  key: string,
  signal: AbortSignal,
  body?: unknown,
) {
  const controller = new AbortController();
  let timeout = false;
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(() => {
    timeout = true;
    controller.abort();
  }, AI_TIMEOUT_MS);
  try {
    const r = await fetch(AI_BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + key,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!r.ok) {
      throw new AiError(
        r.status === 401 || r.status === 403
          ? 'auth'
          : r.status === 402
            ? 'balance'
            : r.status === 429
              ? 'rate'
              : r.status >= 500
                ? 'server'
                : 'configuration',
      );
    }
    let data: unknown;
    try {
      data = await r.json();
    } catch {
      throw new AiError('invalid');
    }
    return { response: r, data };
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(
      signal.aborted ? 'cancelled' : timeout ? 'timeout' : 'network',
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
export class AitunnelClient implements AiClient {
  constructor(
    private readonly keyProvider: () => Promise<string | null> = readApiKey,
  ) {}
  async checkKey(key: string, signal: AbortSignal) {
    const { data } = await request('/aitunnel/balance', key, signal);
    const parsed = z
      .object({ balance: z.number().finite().nonnegative() })
      .safeParse(data);
    if (!parsed.success) throw new AiError('invalid');
    return parsed.data;
  }
  async complete(r: CompletionRequest) {
    const key = await this.keyProvider();
    if (!key) throw new AiError('auth');
    const { response, data } = await request(
      '/chat/completions',
      key,
      r.signal,
      requestBody(r),
    );
    const parsed = z
      .object({
        choices: z
          .array(z.object({ message: z.object({ content: z.string() }) }))
          .min(1),
        usage: z
          .object({
            balance: z.number().nonnegative().optional(),
            cost: z.number().nonnegative().optional(),
            cost_rub: z.number().nonnegative().optional(),
          })
          .optional(),
      })
      .safeParse(data);
    if (!parsed.success) throw new AiError('invalid');
    const content = parsed.data.choices[0]?.message.content;
    if (!content) throw new AiError('invalid');
    const cost =
      number(response.headers.get('cost-rub')) ??
      parsed.data.usage?.cost_rub ??
      parsed.data.usage?.cost;
    const balance =
      number(response.headers.get('balance')) ?? parsed.data.usage?.balance;
    return {
      content: redact(content, key),
      ...(cost === undefined ? {} : { costRub: cost }),
      ...(balance === undefined ? {} : { balance }),
    };
  }
}

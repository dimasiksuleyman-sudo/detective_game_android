/** Общий интерфейс ИИ; тесты и браузерный harness используют только MockAiClient. */
import type { Message } from './promptBuilder';
import type { ModelId } from './config';
export type AiResult = {
  reply: string;
  factIds: string[];
  stressDelta: number;
  valid: boolean;
};
export type Completion = {
  content: string;
  costRub?: number;
  balance?: number;
};
export type CompletionRequest = {
  messages: Message[];
  model: ModelId;
  signal: AbortSignal;
  strictRetry?: boolean;
};
export type AiErrorCode =
  | 'auth'
  | 'balance'
  | 'rate'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid'
  | 'server'
  | 'configuration';
export class AiError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(code);
    this.name = 'AiError';
  }
}
export interface AiClient {
  complete(request: CompletionRequest): Promise<Completion>;
  checkKey(key: string, signal: AbortSignal): Promise<{ balance: number }>;
}
export class MockAiClient implements AiClient {
  public calls: Omit<CompletionRequest, 'signal'>[] = [];
  constructor(
    private readonly result: AiResult = {
      reply: 'Ответ мока',
      factIds: [],
      stressDelta: 0,
      valid: true,
    },
    private readonly script: (Completion | AiError)[] = [],
    private readonly latencyMs = 0,
  ) {}
  async ask(question: string) {
    void question;
    return structuredClone(this.result);
  }
  async complete(request: CompletionRequest): Promise<Completion> {
    if (request.signal.aborted) throw new AiError('cancelled');
    if (this.latencyMs)
      await new Promise<void>((resolve, reject) => {
        const aborted = () => {
          clearTimeout(timer);
          reject(new AiError('cancelled'));
        };
        const timer = setTimeout(() => {
          request.signal.removeEventListener('abort', aborted);
          resolve();
        }, this.latencyMs);
        request.signal.addEventListener('abort', aborted, { once: true });
      });
    if (request.signal.aborted) throw new AiError('cancelled');
    const { signal, ...metadata } = request;
    void signal;
    this.calls.push(structuredClone(metadata));
    const item = this.script.shift();
    if (item instanceof AiError) throw item;
    if (item) return item;
    const last = request.messages.at(-1)?.content ?? '';
    const match = /\[([^\]]+)\]([^\n]*)/.exec(
      request.messages[0]?.content ?? '',
    );
    return {
      content: JSON.stringify({
        reply: last.includes('Движок уже решил исход')
          ? (last.split('вырази только эту реакцию: ')[1] ?? this.result.reply)
          : this.result.reply === 'Ответ мока'
            ? (match?.[2]?.trim() ?? this.result.reply)
            : this.result.reply,
        emotion: last.includes('Движок уже решил') ? 'broken' : 'neutral',
        stress_delta: this.result.stressDelta,
        mentioned_fact_ids: this.result.factIds.length
          ? this.result.factIds
          : match?.[1]
            ? [match[1]]
            : [],
      }),
      costRub: 0.001,
      balance: 100,
    };
  }
  async checkKey(key: string, signal: AbortSignal) {
    if (signal.aborted) throw new AiError('cancelled');
    if (!key.trim()) throw new AiError('auth');
    return { balance: 100 };
  }
}

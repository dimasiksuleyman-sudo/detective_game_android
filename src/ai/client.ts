/** Детерминированный клиент только для тестовых сценариев M1; сетевого клиента здесь нет. */
export type AiResult = {
  reply: string;
  factIds: string[];
  stressDelta: number;
  valid: boolean;
};
export interface AiClient {
  ask(question: string): Promise<AiResult>;
}
export class MockAiClient implements AiClient {
  constructor(
    private readonly result: AiResult = {
      reply: 'Ответ мока',
      factIds: [],
      stressDelta: 0,
      valid: true,
    },
  ) {}
  async ask(question: string) {
    void question;
    return structuredClone(this.result);
  }
}

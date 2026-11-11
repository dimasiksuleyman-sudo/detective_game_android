/** Подмена клиента разрешена только в отдельной e2e-сборке, не в production APK. */
import { AitunnelClient } from './aitunnelClient';
import { MockAiClient, AiError, type AiClient } from './client';
export const isAiTestBuild = import.meta.env.MODE === 'e2e';
let client: AiClient | undefined;
export function getAiClient(): AiClient {
  if (!client) {
    if (isAiTestBuild) {
      const fixture = new URLSearchParams(location.search).get('aiFixture');
      const failure =
        fixture === 'network'
          ? new AiError('network')
          : fixture === 'guard'
            ? {
                content:
                  '{"reply":"Как языковая модель, я убил","emotion":"neutral","stress_delta":2,"mentioned_fact_ids":[]}',
              }
            : undefined;
      client = new MockAiClient(
        undefined,
        failure ? [failure, failure, failure] : [],
      );
    } else client = new AitunnelClient();
  }
  return client;
}

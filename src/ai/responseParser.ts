/** Разбор только JSON-объекта, допускающий одно Markdown-обрамление без постороннего текста. */
import { z } from 'zod';
const response = z.object({
  reply: z.string().min(1).max(12000),
  emotion: z.unknown().optional(),
  stress_delta: z.unknown().optional(),
  mentioned_fact_ids: z.array(z.string()).max(100),
});
export function parseResponse(raw: string) {
  try {
    let text = raw.trim();
    if (text.startsWith('```')) {
      const m = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(text);
      if (!m?.[1]) return null;
      text = m[1].trim();
    }
    return response.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

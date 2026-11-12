/** Маскирование секретов для ответов и ручного отчёта; сырые HTTP-ошибки никогда не выводятся. */
export function redact(text: string, knownSecret?: string) {
  let value = knownSecret ? text.split(knownSecret).join('[REDACTED]') : text;
  value = value
    .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[a-z0-9_-]{8,}/gi, '[REDACTED]');
  return value;
}

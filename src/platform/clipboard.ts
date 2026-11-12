/** Чтение буфера только по явному нажатию пользователя, без записи в логи. */
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
export async function pasteFromClipboard() {
  if (Capacitor.isNativePlatform()) return (await Clipboard.read()).value;
  return navigator.clipboard.readText();
}

export async function copyToClipboard(text: string) {
  if (Capacitor.isNativePlatform()) await Clipboard.write({ string: text });
  else await navigator.clipboard.writeText(text);
}

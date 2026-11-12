/** Ключ: Android Keystore через AES-GCM; web — только sessionStorage для разработки. */
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
const slot = 'interrogation_api_key';
export const isWebKeyStorage = () => !Capacitor.isNativePlatform();
export async function readApiKey(): Promise<string | null> {
  if (isWebKeyStorage()) return sessionStorage.getItem(slot);
  const value = await SecureStorage.get(slot, false, false);
  return typeof value === 'string' ? value : null;
}
export async function storeApiKey(key: string) {
  if (isWebKeyStorage()) {
    sessionStorage.setItem(slot, key);
    return;
  }
  await SecureStorage.set(slot, key, false, false);
}
export async function removeApiKey() {
  if (isWebKeyStorage()) {
    sessionStorage.removeItem(slot);
    return;
  }
  await SecureStorage.remove(slot, false);
}

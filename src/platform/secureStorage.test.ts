import { beforeEach, it, expect, vi } from 'vitest';
const api = vi.hoisted(() => ({
  native: false,
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => api.native },
}));
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: { get: api.get, set: api.set, remove: api.remove },
}));
import { readApiKey, storeApiKey, removeApiKey } from './secureStorage';
beforeEach(() => {
  api.native = false;
  vi.clearAllMocks();
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
it('web хранит ключ только в sessionStorage и удаляет', async () => {
  await storeApiKey('dummy');
  expect(await readApiKey()).toBe('dummy');
  await removeApiKey();
  expect(await readApiKey()).toBeNull();
  expect(api.set).not.toHaveBeenCalled();
});
it('Android передаёт ключ только native plugin, без web fallback', async () => {
  api.native = true;
  api.get.mockResolvedValue('dummy');
  await storeApiKey('dummy');
  expect(api.set).toHaveBeenCalledWith(
    'interrogation_api_key',
    'dummy',
    false,
    false,
  );
  expect(await readApiKey()).toBe('dummy');
  expect(sessionStorage.getItem('interrogation_api_key')).toBeNull();
  await removeApiKey();
  expect(api.remove).toHaveBeenCalledWith('interrogation_api_key', false);
});
it('ошибка Keystore не сохраняет ключ в web-хранилище', async () => {
  api.native = true;
  api.set.mockRejectedValue(new Error('native failure'));
  await expect(storeApiKey('dummy')).rejects.toThrow();
  expect(sessionStorage.getItem('interrogation_api_key')).toBeNull();
});

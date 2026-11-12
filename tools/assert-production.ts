/** Не даёт синхронизировать тестовую подмену клиента в Android APK. */
import { readdir, readFile } from 'node:fs/promises';
import config from '../capacitor.config';
if (config.webDir !== 'dist') throw new Error('Production webDir must be dist');
const files = (await readdir('dist/assets')).filter((f) => f.endsWith('.js'));
if (!files.length) throw new Error('Production JS assets missing');
for (const file of files) {
  const code = await readFile('dist/assets/' + file, 'utf8');
  if (code.includes('aiFixture') || code.includes('Ответ мока'))
    throw new Error('Test AI implementation detected in production');
}
console.log('✅ Production dist: тестовая подмена ИИ отсутствует');

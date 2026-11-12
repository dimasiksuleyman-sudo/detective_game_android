/**
 * Проверка ADR-027: исходники ассетов в art/ (картинки и аудио) хранятся в Git LFS.
 * Смотрит индекс git (а не рабочую копию), поэтому работает и с LFS-указателями в CI,
 * и с уже скачанными файлами у владельца. Файлы, закоммиченные до перехода на LFS,
 * перечислены в .gitattributes с «-filter» и пропускаются.
 */
import { execFileSync } from 'node:child_process';

const BINARY = /\.(png|jpe?g|webp|mp3|wav)$/i;
const POINTER = 'version https://git-lfs.github.com/spec/v1';

const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const files = git(['ls-files', '-z', 'art'])
  .split('\0')
  .filter((f) => BINARY.test(f));

const problems: string[] = [];
for (const file of files) {
  const filter = git(['check-attr', 'filter', '--', file]).trim();
  if (filter.endsWith(': unset')) continue; // legacy: закоммичен до ADR-027
  if (!filter.endsWith(': lfs')) {
    problems.push(`${file}: нет правила LFS в .gitattributes`);
    continue;
  }
  // Первые байты блоба из индекса: у LFS-файла это текстовый указатель.
  const head = execFileSync('git', ['cat-file', 'blob', `:${file}`], {
    maxBuffer: 256 * 1024 * 1024,
  })
    .subarray(0, POINTER.length)
    .toString('utf8');
  if (head !== POINTER)
    problems.push(`${file}: закоммичен мимо LFS (нужен git lfs install)`);
}

if (problems.length) {
  console.error('❌ Git LFS (ADR-027):\n' + problems.join('\n'));
  console.error(
    'Исправление: git lfs install; git rm --cached <файл>; git add <файл>; git commit.',
  );
  process.exit(1);
}
console.log(`✅ Git LFS: ${files.length} файлов исходников в art/ проверено`);

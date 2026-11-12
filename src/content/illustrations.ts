/** Готовность встроенных иллюстраций: только перечисленные ресурсы перестают считаться заглушками. */
import manifest from '../../art/pilot/manifest.json';
export const isFinishedIllustration = (src: string) =>
  manifest.files.some((file) => file.output === src);

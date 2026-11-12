/** Выбранные иллюстрации и их размеры: источник готовности — манифест арта. */
import manifest from '../../art/pilot/manifest.json';
export const illustrationDimensions = (src: string) =>
  manifest.files.find((file) => file.output === src.replace(/^\//, ''));
export const isFinishedIllustration = (src: string) =>
  !!illustrationDimensions(src);

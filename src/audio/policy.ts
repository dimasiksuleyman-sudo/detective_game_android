/** Детерминированные роли экрана, запасной трек и уровни фонового звука. */
import manifest from '../../public/audio/manifest.json';
/** Роль, ещё не готовая как MP3; список может быть пустым, поэтому тип задан явно. */
type PlannedTrack = { id: string; loop: boolean; screens: string[] };
const planned: PlannedTrack[] = manifest.planned;
export interface AudioPreferences {
  music: boolean;
  musicVolume: number;
  effects: boolean;
  rain: boolean;
}
export const defaultAudioPreferences: AudioPreferences = {
  music: true,
  musicVolume: 0.4,
  effects: true,
  rain: false,
};
export function selectMusic(screen: string, solved = false) {
  const desired =
    screen === 's06'
      ? 'music-menu'
      : screen === 's14'
        ? solved
          ? 'music-solved'
          : 'music-unsolved'
        : undefined;
  return (
    manifest.music.find((t) =>
      desired ? t.id === desired : (t.screens as string[]).includes(screen),
    ) ??
    (desired
      ? undefined
      : manifest.music.find(
          (t) => t.id === planned.find((p) => p.screens.includes(screen))?.id,
        )) ??
    manifest.music.find((t) => t.id === 'music-menu') ??
    manifest.music[0]
  );
}
export function musicLevel(prefs: AudioPreferences, duck: boolean) {
  return prefs.music ? prefs.musicVolume * (duck ? 0.25 : 1) : 0;
}

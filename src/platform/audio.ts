/** Единое воспроизведение HTMLAudio в браузере и Android WebView; без сетевого TTS и автозапуска. */
import { setNarrationActive } from './soundscape';
import { watchLifecycle } from './appLifecycle';
let active: HTMLAudioElement | undefined;
function stop(audio: HTMLAudioElement) {
  audio.pause();
  audio.currentTime = 0;
  if (active === audio) {
    active = undefined;
    setNarrationActive(false);
  }
}
export function bindNarration(audio: HTMLAudioElement) {
  const play = () => {
    if (active && active !== audio) stop(active);
    active = audio;
    setNarrationActive(true);
  };
  const quiet = () => {
    if (active === audio) setNarrationActive(false);
  };
  audio.addEventListener('play', play);
  audio.addEventListener('pause', quiet);
  audio.addEventListener('ended', quiet);
  audio.addEventListener('error', quiet);
  // Сворачивание в том числе на брифинге: защита не зависит от игровых личных экранов.
  const unwatch = watchLifecycle(() => stop(audio));
  return () => {
    unwatch();
    audio.removeEventListener('play', play);
    audio.removeEventListener('pause', quiet);
    audio.removeEventListener('ended', quiet);
    audio.removeEventListener('error', quiet);
    stop(audio);
    audio.removeAttribute('src');
    audio.load();
  };
}

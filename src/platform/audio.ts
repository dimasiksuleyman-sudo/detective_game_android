/** Единое воспроизведение HTMLAudio в браузере и Android WebView; без сетевого TTS и автозапуска. */
import { watchLifecycle } from './appLifecycle';
let active: HTMLAudioElement | undefined;
function stop(audio: HTMLAudioElement) {
  audio.pause();
  audio.currentTime = 0;
  if (active === audio) active = undefined;
}
export function bindNarration(audio: HTMLAudioElement) {
  const play = () => {
    if (active && active !== audio) stop(active);
    active = audio;
  };
  audio.addEventListener('play', play);
  // Сворачивание в том числе на брифинге: защита не зависит от игровых личных экранов.
  const unwatch = watchLifecycle(() => stop(audio));
  return () => {
    unwatch();
    audio.removeEventListener('play', play);
    stop(audio);
    audio.removeAttribute('src');
    audio.load();
  };
}

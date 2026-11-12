import { useEffect, useRef, useState } from 'react';
import { bindNarration } from '../platform/audio';
import type { NarrationClip } from '../content/narration';
import { ru } from '../i18n/ru';
export function NarrationPlayer({ clip }: { clip: NarrationClip | undefined }) {
  return clip ? <ClipPlayer key={clip.id} clip={clip} /> : null;
}
function ClipPlayer({ clip }: { clip: NarrationClip }) {
  const label =
    clip.id === 'briefing'
      ? ru.narration.briefing
      : clip.id.startsWith('chief-hint-')
        ? ru.narration.hint
        : clip.id === 'solution-explanation'
          ? ru.narration.solution
          : ru.narration.reconstruction + ' ' + clip.id.split('-').at(-1);
  const ref = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const audio = ref.current;
    if (audio) return bindNarration(audio);
  }, [clip.src]);
  return (
    <section aria-label={ru.narration.title}>
      <p>{label}</p>
      <audio
        ref={ref}
        src={clip.src}
        controls
        preload="none"
        aria-label={label}
        onError={() => setFailed(true)}
        onPlaying={() => setFailed(false)}
      />
      {failed && <p role="status">{ru.narration.unavailable}</p>}
    </section>
  );
}

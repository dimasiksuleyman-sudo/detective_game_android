import { useAudioSettings } from '../store/audioSettingsStore';
import { ru } from '../i18n/ru';
export function AudioSettings() {
  const s = useAudioSettings();
  return (
    <section aria-label={ru.sound.title}>
      <h3>{ru.sound.title}</h3>
      {s.error && <p role="alert">{s.error}</p>}
      <label>
        <input
          type="checkbox"
          checked={s.music}
          onChange={(e) => s.configure({ music: e.target.checked })}
        />
        {ru.sound.music}
      </label>
      <label>
        {ru.sound.volume}
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(s.musicVolume * 100)}
          onChange={(e) =>
            s.configure({ musicVolume: Number(e.target.value) / 100 })
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={s.effects}
          onChange={(e) => s.configure({ effects: e.target.checked })}
        />
        {ru.sound.effects}
      </label>
      <label>
        <input
          type="checkbox"
          checked={s.rain}
          onChange={(e) => s.configure({ rain: e.target.checked })}
        />
        {ru.sound.rain}
      </label>
    </section>
  );
}

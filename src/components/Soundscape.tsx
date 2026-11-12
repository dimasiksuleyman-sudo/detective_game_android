import { useEffect, useRef } from 'react';
import { mountSoundscape, playEffect } from '../platform/soundscape';
import { useAi } from '../ai/coordinator';
import { useSettings } from '../store/settingsStore';
import { useAudioSettings } from '../store/audioSettingsStore';
export function Soundscape({
  screen,
  solved,
}: {
  screen: string;
  solved: boolean;
}) {
  const aiError = useAi((s) => s.error);
  const settingsError = useSettings((s) => s.error);
  useEffect(() => {
    if (aiError || settingsError) playEffect('error');
  }, [aiError, settingsError]);
  const prefs = useAudioSettings();
  const ref = useRef<ReturnType<typeof mountSoundscape> | null>(null);
  const previous = useRef(screen);
  useEffect(() => {
    const instance = mountSoundscape();
    ref.current = instance;
    void useAudioSettings.getState().init();
    return () => {
      ref.current = null;
      instance.dispose();
    };
  }, []);
  useEffect(() => {
    ref.current?.settings({
      music: prefs.music,
      musicVolume: prefs.musicVolume,
      effects: prefs.effects,
      rain: prefs.rain,
    });
  }, [prefs.music, prefs.musicVolume, prefs.effects, prefs.rain]);
  useEffect(() => {
    ref.current?.screen(screen, solved);
    if (screen === 's06') ref.current?.prepare('hold-confirm');
    if (previous.current !== screen) {
      if (screen === 's06') playEffect('handover');
      if (screen === 's09') playEffect('paper');
    }
    previous.current = screen;
  }, [screen, solved]);
  return null;
}

import { MutableRefObject, useCallback, useMemo, useState } from 'react';
import { AudioEngine } from '../engine/AudioEngine';
import { SynthPreset } from '../types/midi';
import { getQwertyLabelMap } from '../utils/qwertyMap';

export function usePracticePrefs(audioRef: MutableRefObject<AudioEngine>, octaveShift: number) {
  const [synthPreset, setSynthPreset] = useState<SynthPreset>('epiano');
  const [showQwertyHints, setShowQwertyHints] = useState(false);

  const changeSynthPreset = useCallback((preset: SynthPreset) => {
    setSynthPreset(preset);
    audioRef.current.setPreset(preset);
  }, [audioRef]);

  const toggleQwertyHints = useCallback(() => {
    setShowQwertyHints((prev) => !prev);
  }, []);

  const qwertyLabels = useMemo(
    () => (showQwertyHints ? getQwertyLabelMap(octaveShift) : undefined),
    [showQwertyHints, octaveShift]
  );

  return { synthPreset, changeSynthPreset, showQwertyHints, toggleQwertyHints, qwertyLabels };
}

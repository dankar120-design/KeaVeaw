import { MidiStatus } from '../types/midi';

export interface MidiBadgeUi {
  label: string;
  className: string;
  showRetry: boolean;
}

export function getMidiBadgeUi(s: MidiStatus): MidiBadgeUi {
  if (!s.supported) {
    return {
      label: s.error || 'Web MIDI stöds inte (QWERTY/Mus)',
      className: 'bg-amber-950/60 text-amber-300 border-amber-700/60',
      showRetry: false,
    };
  }
  if (s.connected) {
    return {
      label: `MIDI: ${s.deviceName ?? 'Ansluten'}`,
      className: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
      showRetry: false,
    };
  }
  if (s.error) {
    return {
      label: s.error,
      className: s.errorKind === 'error'
        ? 'bg-rose-950/70 text-rose-300 border-rose-700/60'
        : 'bg-gray-800 text-gray-300 border-gray-700',
      showRetry: true,
    };
  }
  return {
    label: 'MIDI väntar (QWERTY/Mus)',
    className: 'bg-gray-800 text-gray-300 border-gray-700',
    showRetry: true,
  };
}

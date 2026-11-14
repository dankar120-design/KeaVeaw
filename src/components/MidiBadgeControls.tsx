import { MidiStatus } from '../types/midi';
import { getMidiBadgeUi } from '../utils/midiStatusUi';

export interface MidiBadgeControlsProps {
  midiStatus: MidiStatus;
  onRetryMidi?: () => void;
  onEnableAutoCenter: () => void;
  onDismissOctaveWarning: () => void;
  onResetAutoCenter?: () => void;
}

export function MidiBadgeControls({
  midiStatus,
  onRetryMidi,
  onEnableAutoCenter,
  onDismissOctaveWarning,
  onResetAutoCenter,
}: MidiBadgeControlsProps) {
  const badgeUi = getMidiBadgeUi(midiStatus);
  const offset = midiStatus.activeCenterOffset ?? 0;
  const isCentered = midiStatus.autoCenterOctave && offset !== 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded border px-2.5 py-1.5 font-medium ${badgeUi.className}`}>{badgeUi.label}</span>

      <button
        type="button"
        onClick={onRetryMidi}
        aria-label="Återanslut MIDI"
        className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs hover:bg-gray-700"
      >
        ↻ MIDI
      </button>

      {isCentered && (
        <div className="flex items-center gap-1.5 rounded border border-cyan-600/70 bg-cyan-950/70 px-2.5 py-1 text-cyan-200">
          <span>Auto-centrerad ({offset > 0 ? `+${offset}` : offset})</span>
          <button
            type="button"
            onClick={onResetAutoCenter}
            className="rounded bg-cyan-400 px-2 py-0.5 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Återställ
          </button>
        </div>
      )}

      {midiStatus.detectedOctaveOffset !== 0 && !midiStatus.autoCenterOctave && (
        <div className="flex items-center gap-1.5 rounded border border-amber-600/70 bg-amber-950/70 px-2.5 py-1 text-amber-200">
          <span>Oktav utanför C3–G5 ({midiStatus.detectedOctaveOffset > 0 ? `+${midiStatus.detectedOctaveOffset}` : midiStatus.detectedOctaveOffset})</span>
          <button type="button" onClick={onEnableAutoCenter} className="rounded bg-amber-400 px-2 py-0.5 font-semibold text-slate-950">
            Auto-centrera oktav
          </button>
          <button type="button" aria-label="Stäng oktavvarning" onClick={onDismissOctaveWarning} className="px-1 text-amber-300 hover:text-white">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

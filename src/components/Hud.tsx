import { AudioState, HandIsolation, MidiStatus, Song, SustainMode } from '../types/midi';
import { getMidiBadgeUi } from '../utils/midiStatusUi';

export interface HudProps {
  songs: Song[];
  selectedSongId: string;
  onSelectSong: (songId: string) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onResetLoop: () => void;
  bpm: number;
  onChangeBpm: (nextBpm: number) => void;
  handIsolation: HandIsolation;
  onChangeHandIsolation: (mode: HandIsolation) => void;
  sustainMode: SustainMode;
  onChangeSustainMode: (mode: SustainMode) => void;
  audioState: AudioState;
  onUnlockAudio: () => void;
  midiStatus: MidiStatus;
  onRetryMidi?: () => void;
  onEnableAutoCenter: () => void;
  onDismissOctaveWarning: () => void;
}

export function Hud({
  songs,
  selectedSongId,
  onSelectSong,
  playing,
  onTogglePlay,
  onResetLoop,
  bpm,
  onChangeBpm,
  handIsolation,
  onChangeHandIsolation,
  sustainMode,
  onChangeSustainMode,
  audioState,
  onUnlockAudio,
  midiStatus,
  onRetryMidi,
  onEnableAutoCenter,
  onDismissOctaveWarning,
}: HudProps) {
  const badgeUi = getMidiBadgeUi(midiStatus);

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 bg-gray-900 px-4 py-2.5 text-xs text-gray-100">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Välj låt"
          value={selectedSongId}
          onChange={(e) => onSelectSong(e.target.value)}
          className="rounded border border-gray-700 bg-gray-800 px-2.5 py-1.5 font-medium text-gray-100"
        >
          {songs.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={onTogglePlay}
          className={`rounded px-3 py-1.5 font-semibold ${playing ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950'}`}
        >
          {playing ? 'Pausa' : 'Spela'}
        </button>

        <button type="button" onClick={onResetLoop} className="rounded border border-gray-700 bg-gray-800 px-2.5 py-1.5 hover:bg-gray-700">
          Börja om
        </button>

        <div className="flex items-center rounded border border-gray-700 bg-gray-800">
          <button type="button" onClick={() => onChangeBpm(Math.max(40, bpm - 5))} className="px-2 py-1.5 hover:bg-gray-700">-5</button>
          <span className="px-2 font-mono font-semibold">{bpm} BPM</span>
          <button type="button" onClick={() => onChangeBpm(Math.min(180, bpm + 5))} className="px-2 py-1.5 hover:bg-gray-700">+5</button>
        </div>

        <select
          aria-label="Handisolering"
          value={handIsolation}
          onChange={(e) => onChangeHandIsolation(e.target.value as HandIsolation)}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5"
        >
          <option value="BOTH">Båda händer</option>
          <option value="RIGHT_ONLY">Höger (Auto V)</option>
          <option value="LEFT_ONLY">Vänster (Auto H)</option>
        </select>

        <select
          aria-label="Sustainläge"
          value={sustainMode}
          onChange={(e) => onChangeSustainMode(e.target.value as SustainMode)}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5"
        >
          <option value="AUTO_ROOT">Auto Root</option>
          <option value="LATCH_TOGGLE">Latch Pedal</option>
          <option value="MOMENTARY">Momentary</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUnlockAudio}
          className={`rounded px-3 py-1.5 font-semibold ${audioState === 'suspended' ? 'animate-pulse bg-amber-400 text-slate-950' : 'border border-emerald-700/60 bg-emerald-950/60 text-emerald-300'}`}
        >
          {audioState === 'suspended' ? 'Aktivera Ljud' : 'Ljud Aktivt'}
        </button>

        <span className={`rounded border px-2.5 py-1.5 font-medium ${badgeUi.className}`}>{badgeUi.label}</span>

        {badgeUi.showRetry && (
          <button
            type="button"
            onClick={onRetryMidi}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs hover:bg-gray-700"
          >
            Försök igen
          </button>
        )}

        {midiStatus.detectedOctaveOffset !== 0 && !midiStatus.autoCenterOctave && (
          <div className="flex items-center gap-1.5 rounded border border-amber-600/70 bg-amber-950/70 px-2.5 py-1 text-amber-200">
            <span>Oktav utanför F3–C6 ({midiStatus.detectedOctaveOffset > 0 ? `+${midiStatus.detectedOctaveOffset}` : midiStatus.detectedOctaveOffset})</span>
            <button type="button" onClick={onEnableAutoCenter} className="rounded bg-amber-400 px-2 py-0.5 font-semibold text-slate-950">
              Auto-centrera oktav
            </button>
            <button type="button" aria-label="Stäng oktavvarning" onClick={onDismissOctaveWarning} className="px-1 text-amber-300 hover:text-white">
              ×
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

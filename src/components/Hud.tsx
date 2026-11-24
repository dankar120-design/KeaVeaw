import { AudioState, HandIsolation, MidiStatus, Song, SustainMode, SynthPreset } from '../types/midi';
import { MidiBadgeControls } from './MidiBadgeControls';

export interface HudProps {
  songs: Song[];
  selectedSongId: string;
  onSelectSong: (songId: string) => void;
  playing: boolean;
  onTogglePlay: () => void;
  onToggleDemoPlay?: () => void;
  onResetLoop: () => void;
  bpm: number;
  onChangeBpm: (nextBpm: number) => void;
  handIsolation: HandIsolation;
  onChangeHandIsolation: (mode: HandIsolation) => void;
  sustainMode: SustainMode;
  onChangeSustainMode: (mode: SustainMode) => void;
  synthPreset?: SynthPreset;
  onChangeSynthPreset?: (preset: SynthPreset) => void;
  showQwertyHints?: boolean;
  onToggleQwertyHints?: () => void;
  audioState: AudioState;
  audioPrompt?: boolean;
  onUnlockAudio: () => void;
  midiStatus: MidiStatus;
  onRetryMidi?: () => void;
  onEnableAutoCenter: () => void;
  onDismissOctaveWarning: () => void;
  onResetAutoCenter?: () => void;
}

export function Hud(p: HudProps) {
  const { songs, selectedSongId, onSelectSong, playing, onTogglePlay, onToggleDemoPlay, onResetLoop, bpm, onChangeBpm } = p;
  const { handIsolation, onChangeHandIsolation, sustainMode, onChangeSustainMode } = p;
  const { synthPreset = 'epiano', onChangeSynthPreset, showQwertyHints = false, onToggleQwertyHints } = p;
  const { audioState, audioPrompt = false, onUnlockAudio, midiStatus, onRetryMidi } = p;
  const { onEnableAutoCenter, onDismissOctaveWarning, onResetAutoCenter } = p;
  const practiceSongs = songs.filter((s) => !s.id.startsWith('classic-') && !s.id.startsWith('lesson-'));
  const repertoireSongs = songs.filter((s) => s.id.startsWith('classic-'));
  const lessonSongs = songs.filter((s) => s.id.startsWith('lesson-'));

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-100">
      <div className="flex max-w-full flex-wrap items-center gap-1.5">
        <select aria-label="Välj låt" value={selectedSongId} onChange={(e) => onSelectSong(e.target.value)} className="max-w-full min-w-0 rounded border border-gray-700 bg-gray-800 px-2.5 py-1.5 font-medium text-gray-100">
          {practiceSongs.length > 0 && <optgroup label="Låtar">{practiceSongs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>}
          {repertoireSongs.length > 0 && <optgroup label="Klassiker (C3–G5)">{repertoireSongs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>}
          {lessonSongs.length > 0 && <optgroup label="Lektioner (C3–G5)">{lessonSongs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</optgroup>}
        </select>

        <button type="button" onClick={onTogglePlay} className={`rounded px-3 py-1.5 font-semibold ${playing ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950'}`}>
          {playing ? 'Pausa' : 'Spela'}
        </button>

        <button
          type="button"
          aria-pressed={handIsolation === 'DEMO'}
          onClick={onToggleDemoPlay}
          className={`rounded border px-2.5 py-1.5 font-semibold ${handIsolation === 'DEMO' ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200' : 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
        >
          {handIsolation === 'DEMO' ? 'Sluta lyssna' : 'Lyssna'}
        </button>

        <button type="button" onClick={onResetLoop} className="rounded border border-gray-700 bg-gray-800 px-2.5 py-1.5 hover:bg-gray-700">Börja om</button>

        <div className="flex items-center rounded border border-gray-700 bg-gray-800">
          <button type="button" onClick={() => onChangeBpm(Math.max(40, bpm - 5))} className="px-2 py-1.5 hover:bg-gray-700">-5</button>
          <span className="px-2 font-mono font-semibold">{bpm} BPM</span>
          <button type="button" onClick={() => onChangeBpm(Math.min(180, bpm + 5))} className="px-2 py-1.5 hover:bg-gray-700">+5</button>
        </div>

        <select aria-label="Handisolering" value={handIsolation} onChange={(e) => onChangeHandIsolation(e.target.value as HandIsolation)} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5">
          <option value="BOTH">Båda händer</option>
          <option value="RIGHT_ONLY">Höger (Auto V)</option>
          <option value="LEFT_ONLY">Vänster (Auto H)</option>
          <option value="DEMO">Demo (Lyssna)</option>
        </select>

        <select aria-label="Sustainläge" value={sustainMode} onChange={(e) => onChangeSustainMode(e.target.value as SustainMode)} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5">
          <option value="AUTO_ROOT">Auto Root</option>
          <option value="LATCH_TOGGLE">Latch Pedal</option>
          <option value="MOMENTARY">Momentary</option>
        </select>

        <select aria-label="Klang" value={synthPreset} onChange={(e) => onChangeSynthPreset?.(e.target.value as SynthPreset)} className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5">
          <option value="epiano">EPiano</option>
          <option value="bell">Bell</option>
          <option value="warm_pad">Warm Pad</option>
        </select>

        <button type="button" aria-pressed={showQwertyHints} onClick={onToggleQwertyHints} className={`rounded border px-2.5 py-1.5 font-medium ${showQwertyHints ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200' : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
          Tangenter
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUnlockAudio}
          className={`rounded px-3 py-1.5 font-semibold ${
            audioState === 'suspended'
              ? `animate-pulse bg-amber-400 text-slate-950 ${audioPrompt ? 'ring-2 ring-amber-200 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-amber-500/40' : ''}`
              : 'border border-emerald-700/60 bg-emerald-950/60 text-emerald-300'
          }`}
        >
          {audioState === 'suspended' ? 'Aktivera Ljud' : 'Ljud Aktivt'}
        </button>

        {audioState === 'suspended' && audioPrompt && (
          <span role="status" className="max-w-full rounded border border-amber-500/70 bg-amber-950/80 px-2 py-1 text-amber-200">
            Klicka Aktivera Ljud för att höra MIDI
          </span>
        )}

        <MidiBadgeControls
          midiStatus={midiStatus}
          onRetryMidi={onRetryMidi}
          onEnableAutoCenter={onEnableAutoCenter}
          onDismissOctaveWarning={onDismissOctaveWarning}
          onResetAutoCenter={onResetAutoCenter}
        />
      </div>
    </header>
  );
}

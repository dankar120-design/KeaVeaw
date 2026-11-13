import { Highway } from './components/Highway';
import { Hud } from './components/Hud';
import { Keyboard } from './components/Keyboard';
import { usePracticeEngine } from './hooks/usePracticeEngine';

export default function App() {
  const e = usePracticeEngine();

  return (
    <main className="flex h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-[#0B0F19] text-slate-100">
      <Hud
        songs={e.songs}
        selectedSongId={e.song.id}
        onSelectSong={e.selectSong}
        playing={e.playing}
        onTogglePlay={e.togglePlay}
        onResetLoop={e.resetLoop}
        bpm={e.bpm}
        onChangeBpm={e.changeBpm}
        handIsolation={e.handIsolation}
        onChangeHandIsolation={e.changeHandIsolation}
        sustainMode={e.sustainMode}
        onChangeSustainMode={e.changeSustainMode}
        audioState={e.audioState}
        audioPrompt={e.audioPrompt}
        onUnlockAudio={e.unlockAudio}
        midiStatus={e.midiStatus}
        onRetryMidi={e.retryMidi}
        onEnableAutoCenter={e.enableAutoCenter}
        onDismissOctaveWarning={e.dismissOctaveWarning}
      />

      <Highway
        notes={e.song.notes}
        timeSignature={e.song.timeSignature}
        handIsolation={e.handIsolation}
        playing={e.playing}
        getPlaybackState={e.getPlaybackState}
        drawRef={e.drawRef}
      />

      <Keyboard
        activeNotes={e.activeNotes}
        sustainedNotes={e.sustainedNotes}
        waitingNotes={e.waitingNotes}
        activeChord={e.activeChord}
        onNoteOn={e.pressPointer}
        onNoteOff={e.releasePointer}
      />

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t border-slate-800 bg-gray-950 px-4 py-1 text-[11px] text-slate-400">
        <span>Keystation Mini 32 MK3 · F3–C6</span>
        <span>
          Space: Spela/Pausa · Z/X: Oktav ({e.octaveShift >= 0 ? `+${e.octaveShift / 12}` : e.octaveShift / 12}) · Shift+←/→: Takt
        </span>
      </footer>
    </main>
  );
}

import { SustainMode } from '../types/midi';

export class SustainBuffer {
  private mode: SustainMode = 'AUTO_ROOT';
  private heldKeys = new Set<number>();
  private sustainedKeys = new Set<number>();
  private latchActive = false;
  private pedalDown = false;
  private lastBassPc: number | null = null;

  getMode(): SustainMode {
    return this.mode;
  }

  isSustainActive(): boolean {
    if (this.mode === 'AUTO_ROOT') return true;
    if (this.mode === 'LATCH_TOGGLE') return this.latchActive;
    return this.pedalDown;
  }

  getSustainedOnly(): number[] {
    return Array.from(this.sustainedKeys).filter((m) => !this.heldKeys.has(m));
  }

  setMode(mode: SustainMode): number[] {
    this.mode = mode;
    this.latchActive = false;
    this.pedalDown = false;
    this.lastBassPc = null;
    return this.releaseNonHeld();
  }

  // INVARIANT: Free-play AUTO_ROOT clears only on F3-B3 (53..59) so C4-E4 arpeggios do not clip bass roots.
  onNoteOn(midi: number, isSongMode: boolean): number[] {
    this.sustainedKeys.delete(midi);
    this.heldKeys.add(midi);

    if (this.mode === 'AUTO_ROOT' && !isSongMode && midi >= 53 && midi <= 59) {
      const pc = ((midi % 12) + 12) % 12;
      if (this.lastBassPc !== null && this.lastBassPc !== pc) {
        this.lastBassPc = pc;
        return this.releaseNonHeld(midi);
      }
      this.lastBassPc = pc;
    }
    return [];
  }

  onNoteOff(midi: number): boolean {
    this.heldKeys.delete(midi);
    if (this.isSustainActive()) {
      this.sustainedKeys.add(midi);
      return false;
    }
    this.sustainedKeys.delete(midi);
    return true;
  }

  onSustainPedal(down: boolean): number[] {
    const prev = this.pedalDown;
    this.pedalDown = down;
    if (this.mode === 'AUTO_ROOT') {
      return down && !prev ? this.releaseNonHeld() : [];
    }
    if (this.mode === 'LATCH_TOGGLE') {
      if (down && !prev) {
        this.latchActive = !this.latchActive;
        if (!this.latchActive) return this.releaseNonHeld();
      }
      return [];
    }
    return !down ? this.releaseNonHeld() : [];
  }

  clearSustain(): number[] {
    return this.releaseNonHeld();
  }

  expireSustained(midi: number): void {
    this.sustainedKeys.delete(midi);
  }

  clearAll(): number[] {
    const all = new Set([...this.heldKeys, ...this.sustainedKeys]);
    this.heldKeys.clear();
    this.sustainedKeys.clear();
    this.lastBassPc = null;
    return Array.from(all);
  }

  private releaseNonHeld(exceptMidi?: number): number[] {
    const released: number[] = [];
    for (const m of this.sustainedKeys) {
      if (!this.heldKeys.has(m) && m !== exceptMidi) {
        released.push(m);
        this.sustainedKeys.delete(m);
      }
    }
    return released;
  }
}

export interface PendingNote {
  midi: number;
  velocity: number;
  isSongMode: boolean;
  queuedAt: number;
  releasedBeforeResume: boolean;
}

const MAX_PENDING_NOTES = 16;
const PENDING_NOTE_TTL_MS = 500;

// INVARIANT: Queued notes expire after 500 ms and cap at 16 entries so unlocking AudioContext never replays stale phrases.
export class PendingNoteQueue {
  private items: PendingNote[] = [];

  enqueue(midi: number, velocity: number, isSongMode: boolean, nowMs: number): void {
    this.items = this.items.filter((item) => item.midi !== midi && nowMs - item.queuedAt <= PENDING_NOTE_TTL_MS);
    if (this.items.length >= MAX_PENDING_NOTES) {
      this.items.splice(0, this.items.length - MAX_PENDING_NOTES + 1);
    }
    this.items.push({ midi, velocity, isSongMode, queuedAt: nowMs, releasedBeforeResume: false });
  }

  markReleased(midi: number): boolean {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].midi === midi && !this.items[i].releasedBeforeResume) {
        this.items[i].releasedBeforeResume = true;
        return true;
      }
    }
    return false;
  }

  drain(nowMs: number): PendingNote[] {
    const fresh = this.items.filter((item) => nowMs - item.queuedAt <= PENDING_NOTE_TTL_MS);
    this.items = [];
    return fresh;
  }

  clear(): void {
    this.items = [];
  }
}

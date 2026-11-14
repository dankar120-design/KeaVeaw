export interface SimpleMidiMessageEvent {
  data: Uint8Array;
}

export interface SimpleMidiInput {
  name?: string | null;
  state?: 'connected' | 'disconnected' | string;
  connection?: 'open' | 'closed' | 'pending' | string;
  open?: () => Promise<unknown> | void;
  onmidimessage: ((msg: SimpleMidiMessageEvent) => void) | null;
}

export interface SimpleMidiAccess {
  inputs: { values(): IterableIterator<SimpleMidiInput> };
  onstatechange: (() => void) | null;
}

// INVARIANT: Calling open() on closed ports handles both sync and Promise-returning Web MIDI drivers safely.
export function bindMidiInput(
  input: SimpleMidiInput,
  onMessage: (msg: SimpleMidiMessageEvent) => void
): void {
  if (input.connection === 'closed' && typeof input.open === 'function') {
    try {
      const res = input.open();
      if (res && typeof (res as Promise<unknown>).catch === 'function') {
        (res as Promise<unknown>).catch(() => {});
      }
    } catch {
      // Ignore sync open errors; state remains closed
    }
  }
  input.onmidimessage = onMessage;
}

export function dispatchSafe<T>(listeners: Iterable<(item: T) => void>, payload: T): void {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // Resilient dispatch: ignore listener exception to protect other subscribers
    }
  }
}

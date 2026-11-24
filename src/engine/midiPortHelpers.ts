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

export interface CollectedMidiInputs {
  nextInputs: Set<SimpleMidiInput>;
  deviceName: string | null;
  pendingAsyncOpen: boolean;
}

export function isInputUsable(input: SimpleMidiInput): boolean {
  return input.state !== 'disconnected' && input.connection !== 'closed' && input.connection !== 'pending';
}

export function hasUnopenedConnectedInput(access: SimpleMidiAccess): boolean {
  for (const input of access.inputs.values()) {
    if (input.state !== 'disconnected' && (input.connection === 'closed' || input.connection === 'pending')) {
      return true;
    }
  }
  return false;
}

export function hasUsableInput(access: SimpleMidiAccess): boolean {
  for (const input of access.inputs.values()) {
    if (isInputUsable(input)) return true;
  }
  return false;
}

// INVARIANT: Calling open() on closed/pending ports handles both sync and Promise-returning Web MIDI drivers safely.
export function bindMidiInput(
  input: SimpleMidiInput,
  onMessage: (msg: SimpleMidiMessageEvent) => void,
  onOpened?: () => void,
  onOpenFailed?: () => void
): boolean {
  let pendingAsync = false;
  if ((input.connection === 'closed' || input.connection === 'pending') && typeof input.open === 'function') {
    try {
      const res = input.open();
      if (res && typeof (res as PromiseLike<unknown>).then === 'function') {
        pendingAsync = true;
        (res as PromiseLike<unknown>).then(
          () => {
            if (input.connection === 'closed' || input.connection === 'pending') onOpenFailed?.();
            else onOpened?.();
          },
          () => {
            onOpenFailed?.();
          }
        );
      }
    } catch {
      onOpenFailed?.();
    }
  }
  input.onmidimessage = onMessage;
  return pendingAsync;
}

export function collectAndBindInputs(
  access: SimpleMidiAccess,
  onMessage: (msg: SimpleMidiMessageEvent) => void,
  onOpened: () => void,
  onOpenFailed: () => void
): CollectedMidiInputs {
  const nextInputs = new Set<SimpleMidiInput>();
  let deviceName: string | null = null;
  let pendingAsyncOpen = false;
  for (const input of access.inputs.values()) {
    if (input.state === 'disconnected') { input.onmidimessage = null; continue; }
    nextInputs.add(input);
    deviceName = input.name ?? 'USB MIDI Device';
    if (bindMidiInput(input, onMessage, onOpened, onOpenFailed)) pendingAsyncOpen = true;
  }
  return { nextInputs, deviceName, pendingAsyncOpen };
}

export class MidiReconnectController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;

  constructor(private maxAttempts = 5, private delayMs = 350) {}

  isPending(): boolean { return this.timer !== null; }

  schedule(cb: () => void): boolean {
    if (this.timer !== null || this.attempts >= this.maxAttempts) return false;
    this.attempts += 1;
    this.timer = setTimeout(() => {
      this.timer = null;
      cb();
    }, this.delayMs);
    return true;
  }

  clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  reset(): void {
    this.clear();
    this.attempts = 0;
  }
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

# Architecture: Keystation 32 Solo Weave

## 1. Separation of Concerns (React 18 + Vite + TypeScript)
The codebase enforces strict unidirectional dependency layers with a hard **150-line cap** per `src/**/*.{ts,tsx}` file:

1. **Contracts & Pure Utilities (`src/types/`, `src/utils/`):**
   - `midi.ts`: Immutable TypeScript interfaces and hardware constants (`MIDI_MIN = 53`, `MIDI_MAX = 84`).
   - `musicTheory.ts`: Deterministic note naming, chord pitch-class lookup, interval labeling, and shared 32-key X-coordinate geometry for Canvas/DOM alignment.
   - `qwertyMap.ts`: Laptop keyboard mapping (`F3` upward) with key-repeat and modifier guards.
2. **Real-Time Audio & MIDI Engines (`src/engine/`):**
   - Decoupled from React state to preserve `< 15 ms` audio latency and `60 FPS` timing stability.
   - `AudioEngine.ts` + `sustainBuffer.ts`: Web Audio API polyphonic synthesizer (`latencyHint: 'interactive'`), 24-voice cap, and `AUTO_ROOT` / `LATCH_TOGGLE` / `MOMENTARY` buffer management.
   - `MidiManager.ts`: Pure MIDI frame parser (`parseMidiMessage`) + browser Web MIDI adapter with injectable clock for Node Vitest testing.
   - `Transport.ts`: Deterministic beat clock, discrete edge-triggered `registerNoteOn` Wait-Mode queue, `150 ms` elastic deceleration, snap-to-beat recovery, and scheduled `noteOff` for auto-played accompaniment.
3. **Song Data (`src/data/`):**
   - `songHelpers.ts` + 4 modular arrangements under `src/data/songs/`, verified to stay strictly within `MIDI 53..84`.
4. **Presentation & Orchestration (`src/components/`, `src/App.tsx`):**
   - `Highway.tsx` (`<canvas>`), `Keyboard.tsx` (32 interactive keys), `Hud.tsx` (controls & status), and `App.tsx` (connects engines, `requestAnimationFrame`, macros, and UI).

## 2. Data Storage & GDPR Compliance
* **100% Offline-First / Zero Persistence:** All song data is static in-bundle TypeScript. User MIDI input, tempo tweaks, and audio streams remain strictly in volatile RAM and are never persisted, logged, or transmitted.
* **Zero PII / Zero Cloud:** No user accounts, cookies, analytics, or external network/CDN requests at runtime.

## 3. Error Handling & Resilience
* **Web MIDI Fallback:** `MidiManager` catches `SecurityError` and `NotSupportedError` silently on unsupported browsers (e.g., Firefox) or denied permissions; clickable UI keys and QWERTY remain fully functional.
* **USB Power-Save Reconnect:** `MIDIAccess.onstatechange` automatically rebinds newly re-enumerated USB MIDI inputs on Windows 11.
* **Chromium Autoplay Policy:** `AudioEngine` tracks `suspended | running` state and resumes safely on the first pointer/keyboard gesture or via the HUD `"Aktivera Ljud"` button.
* **Voice & Loop Safety:** `requestAnimationFrame` delta time is capped (`dt <= 50 ms`), oscillator voices are capped at `24` with forced disconnect cleanup, and `allNotesOff()` clears hanging voices on pause or loop reset.

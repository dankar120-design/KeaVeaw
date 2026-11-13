# PRODUCT REQUIREMENTS DOCUMENT (PRD): KEYSTATION 32 SOLO WEAVE
**Målmiljö:** Google Antigravity (AGY) | Lokal exekvering (Windows 11 / Chromium WASAPI)
**Hårdvarumål:** M-Audio Keystation Mini 32 MK3 (USB MIDI, 32 tangenter: F3 [MIDI 53] – C6 [MIDI 84])
**Arkitekturprincip:** 100 % Offline-First, Zero-Cloud, Sub-15ms Latens, Strikt modulär kod (<= 150 rader per `src/`-fil).

---

## 1. SYFTE & PROBLEMLÖSNING
Traditionella piano-appar förutsätter 61–88 tangenter, fotpedal och fasta vänsterhandsackord, vilket skapar fysiska handkrockar på en 32-tangenters miniklaviatur.
Denna applikation översätter en gitarrists fingerspel (Travis-picking, arpeggios, intervallmönster och rullande komp) till solopiano inom exakt 2,5 oktaver (`MIDI 53–84`).

### Låsta Fysikaliska & Biomekaniska Regler
1. **Ingen 3-handsparadox (Smart Sustain):** Användaren kan inte hålla in `Sustain`-knappen (`CC 64`) medan båda händerna spelar. Appen sköter sustain via mjukvarulogik (`AUTO_ROOT`, `LATCH_TOGGLE`, `MOMENTARY`).
2. **Ingen handkrock (Gitarr-väv):** Låtar arrangeras som sammanflätade arpeggios och melodi. Vänster hand slår an basrötter/kvinter och släpper tangenten direkt medan Smart Sustain bär klangen.
3. **Elastisk Wait-Mode:** Fallande toner rullar i fullt tempo så länge träffar sker inom godkänd tolerans, men bromsar in mjukt vid miss utan att bryta rytmkänslan.
4. **Enhands-makron & Fallback:** All loop-, hand- och tempostyrning fungerar via snabba tryck på klaviaturens `Pitch`/`Mod`-knappar **och** via laptopens tangentbord/klickbara UI-tangenter (för test utan USB-hårdvara).

---

## 2. TEKNISK STACK & MODULSTRUKTUR (MAX 150 RADER PER `src/`-FIL)
* **Byggverktyg & Ramverk:** Vite + React 18 + TypeScript (strict) + Tailwind CSS.
* **Testning:** Vitest (`environment: 'node'`) för `Transport` och `MidiManager`.
* **Ljud & MIDI:** Native `Web MIDI API` + Native `Web Audio API` (`AudioContext({ latencyHint: 'interactive' })`) med lokal polyfonisk elpianosyntes.
* **Musikteori:** Ren lokal TypeScript-modul (`src/utils/musicTheory.ts`).
* **Grafik/Canvas:** HTML5 `<canvas>` i 60 FPS för fallande toner + interaktiv 32-tangenters klaviatur.

---

## 3. KÄRNFUNKTIONER & EXAKTA ALGORITMER
1. **Hårdvarulager (`MidiManager.ts`):** `requestMIDIAccess()` med tyst fångst av `SecurityError`/`NotSupportedError`, `onstatechange`-återanslutning, `±12` oktav-detektering utanför `53..84`, Schmitt-hysteres (`engage > 2000`, `rearm < 500`) på `Pitch Bend`, `< 350 ms` dubbelklick på `Pitch Bend` (loop-omstart, isolerad från synthen) och `Mod` (`CC 1 > 64`, hand-isolering), samt `CC 64` sustain.
2. **Smart Auto-Sustain (`AudioEngine.ts` + `sustainBuffer.ts`):** Chromium user-gesture `resume()`-guard, `<= 24` röstpool, `allNotesOff()` vid paus/loop, och 3 lägen (`AUTO_ROOT` med `80 ms` fade vid låt-ackordbyte/`sustainClear` eller fritt spel bas `MIDI 53..59`, `LATCH_TOGGLE`, `MOMENTARY`).
3. **Elastisk Wait-Mode (`Transport.ts`):** Diskret `registerNoteOn`-kö, `earlyWindowMs = min(200, beatSpacingMs * 0.45)`, `lateGraceMs = +120 ms`, `chordRollMs = 90 ms`, `150 ms` mjuk broms till `0.0`, snap-to-beat vid träff, samt schemalagd `noteOff` för auto-spelad hand i `RIGHT_ONLY`/`LEFT_ONLY`.

---

## 4. INBYGGDA LÅTAR (`src/data/songs/`, strikt `MIDI 53..84`)
1. **Nordic Embers (Am - F - C - G Weave)** (4/4)
2. **F-Minor 6/8 Arpeggio Ballad** (6/8, rot på `F3 [53]`)
3. **Cinematic Post-Rock Pulse (Dm - Bb - F - C)** (4/4)
4. **Blues/Rock Shuffle Compact (A7 - D7 - E7)** (4/4)

<?xml version="1.0" encoding="UTF-8"?>
<ledger>
  <record id="DEC-001" kategori="Arkitektur">
    <beslut>Strikt modularisering (&lt;= 150 rader per src-fil) genom utbrytning av rena logikmoduler.</beslut>
    <kärna>Separera Web Audio/MIDI DOM-adapters från ren affärslogik (sustainBuffer.ts, synthVoice.ts, midiParser.ts, transportHelpers.ts, waitMode.ts).</kärna>
    <motivering>Förhindrar monoliter, garanterar testbarhet i Vitest utan webbläsarmockar och uppfyller PRD:ns 150-radersgräns.</motivering>
  </record>
  <record id="DEC-002" kategori="Ljudmotor">
    <beslut>Begränsa frispels-rensning i AUTO_ROOT till basnoter F3–B3 (MIDI 53..59).</beslut>
    <kärna>Endast nya baspitchklasser i det djupaste registret klipper föregående sustainbuffert i fritt spel.</kärna>
    <motivering>Låter arpeggios klättra genom C4–E4 utan att klippa basroten, samtidigt som låtläge styrs deterministiskt via clearSustain.</motivering>
  </record>
  <record id="DEC-003" kategori="Hårdvara">
    <beslut>Schmitt-hysteres på Pitch Bend-dubbelklick (&gt;2000 engage, &lt;500 rearm) samt minsta oktavskift.</beslut>
    <kärna>Förhindra falska dubbelklick på Pitch Bend-ramper och beräkna minsta ±12-multipel in i MIDI 53..84.</kärna>
    <motivering>Matchar M-Audio Keystation Mini 32 MK3:s momentana knappar och fysiska Octave +/-1-skift utan att kasta om tonhöjden i onödan.</motivering>
  </record>
  <record id="DEC-004" kategori="Transport">
    <beslut>Idempotent Wait-Mode med diskret NoteOn-kö, dynamiskt early-tak och rullande ackordskydd.</beslut>
    <kärna>Spåra utlösta auto-grupper separat från beat-position, pausa frysning under aktiv 90 ms ackordrullning och skala tidiga träffar mot notavståndet.</kärna>
    <motivering>Förhindrar dubbeltriggar vid beat-snap, undviker deadlock på utdragna ackord och håller 180 BPM-åttondelar åtskilda.</motivering>
  </record>
  <record id="DEC-005" kategori="UI &amp; Input">
    <beslut>Idle-stoppad Canvas rAF, modulär loop-wrap-projektion, pekarkarta och ISO SE-säker QWERTY-styrning.</beslut>
    <kärna>Separera highwayDraw.ts från Highway.tsx (rAF endast när playing), mappa pointerId -&gt; midi i Keyboard.tsx och använd KeyZ/KeyX med aktiv tömning i qwertyMap.ts samt race-vakt i MidiManager.</kärna>
    <motivering>Eliminerar döda tecken på svenskt tangentbord, fastnade röster vid oktavskift eller snabb touch, och tom Canvas-lucka före loop-wrap inom 150-radersbudgeten.</motivering>
  </record>
  <record id="DEC-006" kategori="Orkestrering">
    <beslut>Centraliserad single-rAF-loop, källräknad tonhållning och bevarade användarröster vid loop-wrap.</beslut>
    <kärna>usePracticeEngine äger enda rAF-klockan via drawRef/stateGetterRef; inputBindings kapslar MIDI/QWERTY/Space-fokus; MultiSourceHoldTracker förhindrar överlappande röstklipp medan registerNoteOn förblir diskret.</kärna>
    <motivering>Eliminerar 1-frames-jitter, oavsiktlig knapptryckning på Space och avklippta hållna noter vid loopEnd utan att överskrida 150-radersgränsen.</motivering>
  </record>
  <record id="DEC-007" kategori="Ljudmotor">
    <beslut>Naturlig 2,8 s elpiano-decay och automatisk utsläckning av sustain-ringar i AudioEngine.</beslut>
    <kärna>synthVoice rampar exponentiellt till 0.0001 på 2,8 s; AudioEngine rensar timerstyrt röst och SustainBuffer-ring vid 2850 ms och notifierar UI via onVoiceChange.</kärna>
    <motivering>Förhindrar att feltoner eller sustainade noter i AUTO_ROOT brummar oändligt vid stillastående transport utan att bryta Web Audio single-stop-regeln.</motivering>
  </record>
  <record id="DEC-008" kategori="Orkestrering &amp; Ljudmotor">
    <beslut>Auto-start på startnoter vid beat === loopStart, dolda väntebadges i paus, röstverifierad sustain och isSongMode-propagering.</beslut>
    <kärna>shouldAutoStartOnPress startar transport vid anslag på väntande startnot; Transport.snapshot döljer waitingNotes vid paus mitt i låt; AudioEngine filtrerar sustain mot aktiva röster och delar röststädning med synthVoice (140 rader); pressNote skickar playingRef.current som isSongMode.</kärna>
    <motivering>Eliminerar UX-fällan vid låtbyte/paus, förhindrar odödliga spök-sustainringar efter 2,85 s nedhållning, uppfyller DEC-002 i låtläge och återställer god marginal under 150-radersgränsen.</motivering>
  </record>
  <record id="DEC-009" kategori="UI &amp; Input">
    <beslut>BracketLeft till A#4 (MIDI 70), preventDefault på mappade tangenter, fokus-outline på Keyboard, svensk MIDI-status med Försök igen och SVG-favicon under /KeaVeaw/.</beslut>
    <kärna>qwertyMap mappar BracketLeft=70 och inputBindings kör e.preventDefault() vid spelbara tangenter (exkl. textfält/modifiers); Keyboard använder focus-visible:outline för att undvika ring-inset-kollision; MidiStatus bär errorKind och midiStatusUi skiljer neutral notis från nekad behörighet med retryMidi; public/favicon.svg länkas via %BASE_URL%favicon.svg.</kärna>
    <motivering>Åtgärdar Firefox snabbsökning på Quote (B4), lägger till komplett kromatik vid A#4, säkrar WCAG 2.4.7 utan visuell krock, ger svensk MIDI-status med omförsök och eliminerar 404 på favicon.</motivering>
  </record>
</ledger>

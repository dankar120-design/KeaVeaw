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
  <record id="DEC-010" kategori="Audit-härdning (UI, Input &amp; MIDI)">
    <beslut>Kontrastanpassad key-outline utan z-20-läckage, repeat-säkrad preventDefault, header-scoped Space-blur och utbruten MIDI-felparsning med hot-plug-rensning.</beslut>
    <kärna>Keyboard separerar focusClass (slate-950 vit / cyan-300 svart) utan focus-visible:z-20; qwertyMap exporterar isPlayableTargetEvent och inputBindings blockerar Firefox Quick Find även på keydown-repeat samt blurrar enbart header-knappar vid Space; parseMidiError exporteras i midiStatusUi och MidiManager.refreshInputs nollställer error/errorKind när hasInput är true.</kärna>
    <motivering>Eliminerar osynlig vit-på-vit fokusram (E4) och z-index-kollision mot svarta tangenter, hindrar nedhållen Quote-tangent från att utlösa snabbsökning utan omtriggning, bevarar tangentbordsfokus på pianotangenter och garanterar ren MIDI-status och god marginal under 150-radersregeln.</motivering>
  </record>
  <record id="DEC-011" kategori="Kvalitet, Responsivitet, MIDI &amp; Ljudstatus">
    <beslut>Ackordsynkad basrot, paus-etikett i vänteläge, flödesanpassad låg-höjds-layout, USB-MIDI-urkopplingsflush samt köad första ton med MIDI-ljuduppmaning.</beslut>
    <kärna>musicTheory exponerar chordRootPitchClass via parseChordParts och cinematicPulse använder rootMidi=60 på beat 12/28 (#7); highwayDraw visar PAUSAD i stället för VÄNTAR när state.playing är false under frysning/inbromsning (#9); App/Highway/Keyboard/Hud använder h-dvh med overflow-y-auto, min-h-[120px] och clamp(112px,24dvh,176px) (#8); MidiFrameParser.flush() + CC 120/121/123, activeInputs och disconnected-vakt i MidiManager samt releaseSource('midi') i inputBindings rensar hängande noter vid urkoppling (#5); PendingNoteQueue (16 noter, 500 ms TTL), ctx.onstatechange, röst-/dispose-skydd i AudioEngine och useAudioStatus spelar upp köade initialtoner och visar MIDI-ljudnotis i Hud enbart vid MIDI-ingång (#6).</kärna>
    <motivering>Åtgärdar felaktiga intervallbrickor, missvisande väntestatus vid paus, kapad klaviatur på låga fönster (&lt;520 px), hängande noter vid urkopplad eller Channel-Mode-sändande MIDI-enhet samt tyst första ton eller osynkad ljudindikator inom 150-radersgränsen (DEC-001).</motivering>
  </record>
  <record id="DEC-012" kategori="Hårdvara (#10) &amp; Resiliens (#11)">
    <beslut>Fysiskt C3–G5-omfång (MIDI 48–79, ersätter DEC-002/003), enhetlig oktavcentrering utan klyvning/flush-reset och härdad port-/fokus-/ljud-/re-strike-kedja.</beslut>
    <kärna>MIDI_MIN=48 och MIDI_MAX=79 över hela kedjan: qwertyMap (KeyA=48..BracketLeft=66), SustainBuffer basrensning 48..59 (#10), samt in-range fMinorArpeggio/cinematicPulse/bluesShuffle (med sänkt D7/E7-baskomp). MidiFrameParser håller enhetlig detectedOffset/activeCenterOffset över hela 32-tangentspannet tills ett anslag faller utanför skiftat omfång, bevarar activeCenterOffset över flush() när autoCenter är aktivt, och skiftar hållna ackord atomärt (noteOff + remappad noteOn via rebalanceHeldNotes/applyOffset) utan tonklyvning. MidiPortHelpers + MidiManager genomför flush/activeInputs-tömning vid connect(), open() på closed-portar, icke-destruktiv ensureConnected() vid window focus/visibilitychange, rebalanceHeldNotes/clearCenterOffset-synk i setAutoCenterOctave()/resetAutoCenter(), samt try/catch i emitEvents. MidiBadgeControls bryts ut ur Hud (DEC-001) med permanent ↻ MIDI-återställning; MultiSourceHoldTracker.hasSource tillåter MIDI re-strike efter missat noteOff utan att bryta DEC-006; useAudioStatus triggar ljudprompt vid mid-session suspend (#11).</kärna>
    <motivering>Stämmer fysiskt överens med M-Audio Keystation Mini 32 MK3 (C3–G5), eliminerar tonklyvning i Octave +1/-1/+2 och handkrock på C5 i bluesShuffle, återställer strypta/stängda Web MIDI-portar efter vila/fokusbyte utan att klippa levande ackord vid Alt+Tab eller tappa auto-centrering vid ↻ MIDI, och hindrar hängande MIDI-tangenter från att blockera ljud under 150-radersbudgeten.</motivering>
  </record>
  <record id="DEC-013" kategori="Audit-härdning (MidiParser &amp; DEC-004)">
    <beslut>Tvåfasig oktavombalansering, syntetisk rebalance-flaggning, -Infinity double-tap-initiering och clamp-kollisionsvakt (#10).</beslut>
    <kärna>rebalanceNoteMap (midiNoteRebalance.ts) emitterar alla noteOff före alla noteOn med rebalance: true på ParsedMidiEvent; inputBindings + usePracticeEngine + shouldAutoStartOnPress skippar syntetisk Transport.registerNoteOn/auto-start vid rebalance=true (DEC-004) utan att röra Set-baserad MultiSourceHoldTracker (#11 re-strike-skydd); midiTapTracker initierar och nollställer lastTime=-Infinity; MidiFrameParser.isMidiStillHeld och flushActiveNotes skyddar delade clampade MIDI-toner tills sista råtangent släpps.</kärna>
    <motivering>Eliminerar bortfall av flyttade ackordtoner vid fallande intervall (t.ex. [72, 60] -&gt; 91), falska dubbelklick under 350 ms från start/reset, falska Wait-Mode-träffar och förtida tonklipp vid clamp-kollision under 150-radersbudgeten (DEC-001).</motivering>
  </record>
  <record id="DEC-014" kategori="UX, Ljudmotor &amp; 32-Tangenters Lektioner">
    <beslut>DEMO-lyssningsläge med beat-synkad handväxling, 3 Web Audio-klanger, container-glissando med QWERTY-etiketter samt 5 omtolkade C3–G5-lektioner.</beslut>
    <kärna>HandIsolation utökas med 'DEMO' (splitHands -&gt; auto, full canvas-opacitet i highwayDraw) medan cycleHandIsolation håller hårdvarucykling mellan spelbara lägen; Transport.setHandIsolation returnerar TransportSnapshot med avbrutna autoNoteOffs, synkar completedGroups/triggeredAutoGroups mot beat och nollställer freeze i DEMO. synthVoice stöder 'epiano' | 'bell' | 'warm_pad' inom befintliga Web Audio-noder och AudioEngine håller DEC-001 (&lt;=150 rader) via voicePoolHelpers.ts. Keyboard använder container-baserat pointer-glissando via keyboardPointer.ts, window.blur-rensning, C4-ankare och valfri getQwertyLabelMap via usePracticePrefs.ts. 5 omtolkade lektioner (MIDI 48..79) med sustainClear på stegvisa löpningar registreras i LESSON_SONGS/SONGS.</kärna>
    <motivering>Ger ePiano.org-inspirerad inlärning (lyssna först via DEMO, glissando, tangentledtrådar, klangval och progressiva övningar) anpassad strikt för Keystation Mini 32 MK3 utan externa samplingar och med alla src-filer &lt;= 149 rader.</motivering>
  </record>
  <record id="DEC-015" kategori="Audit-härdning (Genomförande 2)">
    <beslut>Härdad Transport/Audio-synk, multi-touch glissando i Keyboard samt Smart Sustain och unison-frihet i lektionerna.</beslut>
    <kärna>applyTransportEffects skyddar userHeldMidis även i autoNoteOffs-loopen; Transport.setHandIsolation (144 rader) rensar sustain vid byte bort från 'DEMO' och bevarar redan utlösta triggeredAutoGroups vid exakt beat-match; AudioEngine.dispose() stoppar aktiva röster synkront med forceStop före ctx.close(). keyboardPointer spårar Map&lt;number, number | null&gt; med per-MIDI multi-touch-referensräkning, återupptaget glissando efter utträde, noteOff-utsläpp i clearKeyPointers och Enter-aktivering (utan att röra Space, DEC-010). Lektion 1–3 och 5 tar bort blanket-sustainClear på RH så AUTO_ROOT bär basrötter, och lessonMinorColours BAR_1..4 RH lyfts till A4–G5 utan L/R-unison eller handkorsning inom MIDI 48..79.</kärna>
    <motivering>Eliminerar avklippta användartoner, spöksustain från DEMO, dubbeltriggade auto-grupper, glissando-bortfall/multi-touch-klipp, bruten Smart Sustain i lektioner och unison-krock på A3 (MIDI 57) med 24/24 testfiler (109 tester) gröna och samtliga src-filer &lt;= 149 rader (DEC-001).</motivering>
  </record>
  <record id="DEC-016" kategori="Hårdvara, UX &amp; Klassisk Repertoar">
    <beslut>Plug-and-play USB MIDI auto-reconnect, framträdande 1-klicks Lyssna-knapp samt 4 klassiska stycken för C3–G5.</beslut>
    <kärna>midiPortHelpers exporterar MidiReconnectController (max 5 försök, 350 ms backoff), isInputUsable (bevarar connection===undefined-mockar) samt bindMidiInput-callbacks för 'closed'|'pending'; MidiManager (148 rader) använder wantConnected för att återhämta sig över flersekunders USB-glapp utan att loopa utan hårdvara och städar timers i disconnect()/connect(). usePracticeControls lägger till toggleDemoPlay (sparar senaste spelbara läge och pausar transport vid avslut) exponerad direkt via ...controls i oförändrad usePracticeEngine.ts, kopplad till en Lyssna/Sluta lyssna-knapp i Hud. REPERTOIRE_SONGS lägger till classicPassacagliaEasy, classicPassacagliaVar, classicBachPreludeC och classicFurElise (MIDI 48..79, noll L/R-unison) under &lt;optgroup label="Klassiker (C3–G5)"&gt;.</kärna>
    <motivering>Eliminerar död MIDI-port efter kort USB-sladdglapp, synliggör Demo-lyssning i ett klick bredvid Spela och ger nybörjare riktiga klassiker inom 32 tangenter med 26/26 testsviter (116 tester) gröna och samtliga src-filer &lt;= 149 rader (DEC-001).</motivering>
  </record>
  <record id="DEC-017" kategori="Härdning">
    <beslut>Asynkront portöppningsskydd, ensureConnected-återhämtning, säker DEMO/selectSong-återställning samt Bach/Für Elise-notering och taktart-verifiering</beslut>
    <kärna>bindMidiInput()/collectAndBindInputs() i midiPortHelpers.ts returnerar pendingAsyncOpen så MidiManager.scheduleAutoReconnect() inte kör förtida connect() under asynkron open(); ensureConnected() och ny port efter >1750 ms återställer MidiReconnectController; selectSong() återställer lastPlayableHandRef när hand är 'DEMO' och toggleDemoPlay() passerar preserveUserHeld=true vid stopp; classicBachPreludeC.ts håller LH-bastonerna (1.75/1.5), classicFurElise.ts börjar rent på upptakten (beat 2.0) och songsIntegrity.test.ts använder song.timeSignature[0].</kärna>
    <motivering>Stänger samtliga kvarvarande race conditions och UX/notationsbuggar från Fas 2-audit med 26/26 testsviter (121/121 tester) gröna, ren Vite/TypeScript-build och max 149 rader per fil (MidiManager.ts 141 rader, DEC-001).</motivering>
  </record>
  <record id="DEC-018" kategori="Repertoar, Musikteori &amp; Klassisk Autenticitet">
    <beslut>35-takters Bach BWV 846, autentisk A–B–A Für Elise, korrigerad Passacaglia, ny Pachebels kanon i C-dur samt dim7/m7b5/7sus4/slash-stöd i musicTheory</beslut>
    <kärna>musicTheory.ts utökar CHORD_INTERVALS med dim7/m7b5/7sus4 och strippar /bass i parseChordParts(). classicBachPreludeC.ts genererar alla 35 takter av BWV 846 via kompakt BARS-tabell plus cadenceRun för takt 33–35 och 2.0 slag svans (89 rader, G2/C2 lyft 1 oktav till G3/C3). classicFurElise.ts rensar LH i eliseMotifBar(), använder 3 uppåtgående 3/8-åttondelar i eliseAnsBar(), rättar B-delsnoterna (G4–F5–E5, F4–E5–D5) och fullbordar A-återgång med 2.0 slag svans (104 rader). Passacaglia Easy/Var vänder nedåtgående Bb/Gm-baskvinter uppåt utan L/R-unison. classicPachelbelCanon.ts (129 rader) läggs i REPERTOIRE_SONGS i C-dur (4/4 med halvtakts ackordbyten &lt;= 2.0 slag och 2.0 slag svans), med separat classicsAuthenticity.test.ts för röd-till-grön regressionstäckning.</kärna>
    <motivering>Åtgärdar felnoter, kapad 8-takts-Bach, abrupt 40 ms loop-klippning vid slutackord och felaktig klaviaturbelysning vid dim7/slash-ackord med 27/27 testsviter (126/126 tester) gröna, ren build och max 149 rader per fil (DEC-001).</motivering>
  </record>
  <record id="DEC-019" kategori="Repertoar-härdning (Genomförande 2)">
    <beslut>Ackordsynkad Pachelbel-melodi, 2:a reprisslut med fulla ackordmarkörer i Für Elise, dynamisk cadenceRun-roll i Bach samt slutpaus i Passacaglia</beslut>
    <kärna>classicPachelbelCanon.ts synkar DEL1_QUARTER_NOTES och DEL2_EIGHTH_A (Em) mot PROGRESSION så samtliga starkslag ligger inom respektive ackords chordPitchClasses (eliminerar F4-dissonans mot Am/Em). classicFurElise.ts Del 3 använder Beethovens 2:a reprisslut (beat 45 E4-C5-B4 -> beat 48..51 Am med endBeat 53) och kompletta ackordmarkörer (39, 42, 45, 48). classicBachPreludeC.ts använder r(48) i cadenceRun() så G7/C får korrekt basroll. Passacaglia Easy/Var får endBeat 66 (2.0 slag ring-out-svans), verifierat röd->grön i classicsAuthenticity.test.ts.</kärna>
    <motivering>Tar bort kvarvarande harmoniska dissonanser, reprisslut-glapp, roll-fel och loopEnd-strypning över samtliga 5 klassiker med 27/27 testsviter (126/126 tester) gröna, ren Vite/TypeScript-build och max 149 rader per fil (DEC-001).</motivering>
  </record>
  <record id="DEC-020" kategori="Wait-Mode, UX &amp; Musikteori">
    <beslut>Strikt 120 ms samtidighetskontroll i Wait-Mode, landningsbricka med 3 px ram för väntande tangenter samt live-ackorddetektor i Highway</beslut>
    <kärna>waitMode.ts exporterar CHORD_ROLL_WINDOW_MS = 120 och ersätter QueuedHit med kronologisk QueuedEvent ('on' | 'off') så Transport.registerNoteOff() dräneras i exakt händelseordning tillsammans med felton-reset och timeout-rensning i både consumeHits och updateFreezeState; setPlaying(false) och setHandIsolation nollställer delmatchning. keyboardVisuals.ts (74 rader) implementerar Förslag A med ring-[3px] ring-inset (amber V / cyan H), sammanslagen waiting-pad-bottenbricka, naturlig övre tangentfärg och !waiting-skydd för sustainRing i Keyboard.tsx (120 rader). chordDetect.ts identifierar deterministiskt treklanger, fyrklanger och /Bass-omvändningar via 2-pass-matchning (rotposition först) från användarens holdsRef.current.getActiveMidis() bakom playedChordRef-diff i usePracticeEngine.ts (145 rader) och renderar played-chord-badge i Highway.tsx (89 rader).</kärna>
    <motivering>Hindrar spelaren från att slinka förbi flertoniga ackord med ensidiga missar eller släppta tangenter, eliminerar visuell sammanblandning mellan väntande och nedtryckt tangent och visar spelat ackord i realtid med 30/30 testsviter (143/143 tester) gröna och max 149 rader per src-fil (DEC-001).</motivering>
  </record>
  <record id="DEC-021" kategori="Audit-härdning (Genomförande 2)">
    <beslut>Omslagsmarkering för nedhållna väntetangenter (isRestrike), komplett Wait-Mode-kösynk, piano-standardiserad enharmonik med add9/9:or samt 0-allokerings-cachning i rAF</beslut>
    <kärna>keyboardVisuals.ts (77 rader) behåller ring-[3px] och visar bg-slate-950 omslagsbricka (↻ V·F5 / ↻V) vid waiting &amp;&amp; isActive samt whitespace-nowrap på waitingPad. Transport.setHandIsolation() (148 rader) rensar hitQueue i alla handlägen; waitMode.ts (124 rader) nollställer hela delmatchningen vid tidig off i flernotsackord, förnyar firstChordHitMs vid re-strike av ensam matchad ton och dränerar eftersläpande on-borstningar &lt;= 25 ms; inputBindings.ts och usePracticeControls.ts anropar transport.registerNoteOff?.(m) vid disconnect, blur och retryMidi. chordDetect.ts (75 rader) inför DEFAULT_NAMES/FLAT_NAMES, shouldPreferFlats() samt add9/madd9/m(maj7)/maj9/m9/9; MultiSourceHoldTracker.getVersion() och chordKeyRef i usePracticeEngine.ts (148 rader) eliminerar 60 fps allokeringar i syncVisualNotes.</kärna>
    <motivering>Eliminerar UX-deadlock på nedhållna tangenter efter ackord-reset, täpper kvarstående kö-/release-läckor, anpassar enharmonik efter samtliga 14 låtar utan rAF GC-tryck och passerar röd-&gt;grön i chordHoldsSync.test.ts med 31/31 testsviter (156/156 tester) gröna och max 149 rader per src-fil (DEC-001).</motivering>
  </record>
  <record id="DEC-022" kategori="Wait-Mode (Hardening)">
    <beslut>Lås upp frysning endast när hela ackordet fullbordats; begränsa rollingChord till olåst transport med +240 ms-tak och snappa sen rullning</beslut>
    <kärna>updateFreezeState() i waitMode.ts begränsar rollingChord med !ws.isFrozen &amp;&amp; ws.speedMultiplier === 1 &amp;&amp; deltaMs &lt;= 120 + CHORD_ROLL_WINDOW_MS så partiella träffar aldrig låser upp en frusen eller inbromsad transport. consumeHits() kräver !ws.isFrozen &amp;&amp; ws.speedMultiplier === 1 för att förnya firstChordHitMs på re-strike och sätter snappedBeat = g.beat även när (beat - g.beat) / beatsPerMs &gt; 120 efter slutförd sen ackordrullning.</kärna>
    <motivering>Åtgärdar allvarlig Wait-Mode-bugg där peppring på en ensam tangent matade igenom obearbetade flertoniga ackord genom att nollställa isFrozen varje knapptryck, verifierat röd-&gt;grön i waitModeChords.test.ts med 31/31 testsviter (159/159 tester) gröna, ren TypeScript/Vite-build och max 149 rader per src-fil (DEC-001).</motivering>
  </record>
  <record id="DEC-023" kategori="Klassisk Repertoar">
    <beslut>Standardversion av Handel–Halvorsens Passacaglia i G-moll (Original — 24 takter i 3 delar för C3–G5)</beslut>
    <kärna>classicPassacaglia.ts (121 rader) registreras först i REPERTOIRE_SONGS (6 klassiker, 15 låtar totalt) med 3 sektioner över Gm–Cm–F–Bb–Eb–Cm–D–Gm (82 BPM, endBeat 98 med 2.0 slag ring-out-svans): Del 1 (0..32) spelar Handels punkterade originaltema inklusive autentiska genomgångsåttondelar i Cm (D5), Bb (C5) och D7 (C5) över rullande 4-fjärdedelsbas (MIDI 48..65); Del 2 (32..64) spelar den melodiska åttondelssekvensen (64 åttondelar i RH MIDI 66..79); Del 3 (64..98) återför huvudtemat med rytmisk drivkraft till G-moll-slutkadensen med noll L/R-unison.</kärna>
    <motivering>Ger den vanligaste, sammanhängande solopianoversionen av Passacaglia mellan den förenklade temaversionen och arpeggiovariationen, verifierat röd-&gt;grön i classicsAuthenticity.test.ts och Transport.test.ts med 31/31 testsviter (160/160 tester) gröna och max 149 rader per src-fil (DEC-001).</motivering>
  </record>
  <record id="DEC-024" kategori="Klassisk Repertoar">
    <beslut>Förenklad 1-tons vänsterhandsbas med autentisk högerhandsmelodi för Passacaglia i G-moll (Kovalev #5619808-båge) och Pachebels kanon i C-dur</beslut>
    <kärna>classicPassacaglia.ts (98 rader, 78 BPM, endBeat 98) behåller G-moll (toppton G5 = MIDI 79) med en lång LH-baston per takt (dur 3.8, MIDI 48..58) i Del 1–3 medan höger hand spelar Kovalev-bågen från punkterat tema (0..32) via 64 flödande åttondelar (32..64) till sextondelskaskad (0.25-slag) och slutkadens (64..98). classicPachelbelCanon.ts (112 rader, 66 BPM, endBeat 69) använder 1 LH-baston per 2-slagsackord (dur 1.9, MIDI 48..57, före beat 64) samt autentisk 4-stegs RH-kanon (DEL1_HALF_NOTES, DEL1_CANON_LINE, DEL2_EIGHTHS och DEL2_SIXTEENTHS med 0.25-slag) och slutkadens i C på beat 64.</kärna>
    <motivering>Fokuserar övningen på den igenkännbara högerhandsmelodin utan L/R-kollisioner eller täta vänsterhandsackord, verifierat röd-&gt;grön i classicsAuthenticity.test.ts (6/6) och songsIntegrity.test.ts (9/9) samt hela testsviten (31/31 sviter, 160/160 tester), tsc --noEmit och Vite-build.</motivering>
  </record>
  <record id="DEC-025" kategori="Wait-Mode, UX &amp; Pilottest-härdning">
    <beslut>Källmedveten pointer-stegning i Wait-Mode (#12), DEMO-inputvakt (#18), utökat QWERTY-omfång till G4/G5 (#13), header-select id/name (#14) samt mobilpassad väntbricka (#17)</beslut>
    <kärna>InputSource flyttas till src/types/midi.ts (re-exporterad i practiceEffects.ts). waitMode.ts spårar pointerMatched: Set&lt;number&gt; med atomär clearPartialMatch(ws) över samtliga 7 reset-ställen i waitMode.ts och Transport.ts (148 rader); pointer-träffar ignorerar pointerup och 120 ms-expiration utan att förlänga rollingChord medan MIDI/QWERTY samt 1-arg blur/disconnect-release i inputBindings.ts/usePracticeControls.ts behåller strikt DEC-020/021/022. Transport.registerNoteOn/Off ignorerar anrop när handIsolation === 'DEMO'. qwertyMap.ts lägger till BracketRight=67 (G4, ']') för full C4–G5-täckning vid +12 utan Backslash. Hud.tsx ger unika id/name till samtliga 4 select, keyboardVisuals.ts lägger till overflow-hidden och text-[8px] sm:text-[9px]/sm:text-[10px], och midiCentering.test.ts täcker fysiskt Octave +2-ackord [72, 84, 103].</kärna>
    <motivering>Gör flertoniga ackord klickbara utan USB-MIDI enligt PRD §1.4 utan att försvaga MIDI-samtidighetskontrollen, eliminerar onödig DEMO-köning, når G5 i +12 och åtgärdar DevTools/mobil-UI-fynd med 32/32 testsviter (170/170 tester) gröna, ren tsc/Vite-build och samtliga src-filer &lt;= 148 rader (DEC-001).</motivering>
  </record>
  <record id="DEC-026" kategori="Audit-härdning (Genomförande 2)">
    <beslut>Strikt all-pointer-villkor i waitMode.ts, breddbegränsad overflow-hidden på svarta tangenter och MidiManager-statusverifiering för Octave +2</beslut>
    <kärna>waitMode.ts kräver pointerMatched.size === matchedInPending.size (rad 72), pointerMatched.size === 0 på single-match re-strike (rad 80) samt pointerMatched.size &lt; matchedInPending.size i updateFreezeState (rad 120) så blandade MIDI-först + pointer-tvåa-träffar fortfarande löper ut efter 120 ms. keyboardVisuals.ts lägger till max-w-[calc(100%-2px)] på svarta tangenters waitingPad (rad 68), och midiCentering.test.ts verifierar MidiManager.setAutoCenterOctave(true) -&gt; activeCenterOffset === -24.</kärna>
    <motivering>Stänger kvarvarande hybrid-lucka i Wait-Mode och säkerställer klippning på svarta 12,7 px-tangenter vid 390 px bredd, verifierat rött-&gt;grönt med 32/32 testsviter (172/172 tester) gröna, ren tsc/Vite-build och samtliga src-filer &lt;= 148 rader (DEC-001).</motivering>
  </record>
</ledger>

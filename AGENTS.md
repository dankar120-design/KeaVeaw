# AGENTS.md — Keystation 32 Solo Weave (`KeaVeaw`)

Detta dokument gäller för alla agenter (`**[AGY]**` och `**[Cursor]**`) som arbetar i repot.

## 1. Identitet & GitHub Issues (`grok-granskning`)
* **Identitetsprefix:** Varje kommentar på GitHub Issues ska tydligt markeras av respektive roll: `**[AGY]**` (utvecklare/deployer) och `**[Cursor]**` (oberoende granskare / Grok-bot).
* **Commit-referenser:** Använd alltid `Refs #N` (aldrig `Fixes #N`, `Closes #N` eller `Resolves #N`) i commit-meddelanden och PR:er. Endast granskaren stänger en `grok-granskning`-issue efter verifiering i skarp miljö.
* **Överlämning:** AGY postar `**[AGY]** Klar för verifiering` med fullständig commit-SHA, testkommandon och rå testutskrift först när kod, tester och GitHub Pages-deploy är gröna.

## 2. Testbevis & Verifieringskrav
* Ett nytt test som ska bevisa en fix måste visas rött utan fixen och grönt med fixen, med rå utskrift. Ett test som är grönt ändå räknas inte.
* Alla kontroller ska köras lokalt efter sista kodändring:
  * `npx tsc --noEmit`
  * `npx vitest run`
  * `npm run build`

## 3. Arkitektur- & Kodregler
* **150-radersgräns:** Varje källkods- och testfil under `src/**/*.{ts,tsx}` ska hållas `<= 150` rader (`DEC-001`).
* **Offline-first & Web Audio/MIDI:** Håll Web Audio/MIDI-motorer frikopplade från React-state för `< 15 ms` latens, och dokumentera nya systembeslut i `decision_ledger.md` först efter att lösningen är verifierad.

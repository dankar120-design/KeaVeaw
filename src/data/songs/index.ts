import { Song } from '../../types/midi';
import { nordicEmbers } from './nordicEmbers';
import { fMinorArpeggio } from './fMinorArpeggio';
import { cinematicPulse } from './cinematicPulse';
import { bluesShuffle } from './bluesShuffle';
import { classicPassacaglia } from './classicPassacaglia';
import { classicPassacagliaEasy } from './classicPassacagliaEasy';
import { classicPassacagliaVar } from './classicPassacagliaVar';
import { classicBachPreludeC } from './classicBachPreludeC';
import { classicFurElise } from './classicFurElise';
import { classicPachelbelCanon } from './classicPachelbelCanon';
import { lessonFiveFingerWeave } from './lessonFiveFingerWeave';
import { lessonFingerGymThirds } from './lessonFingerGymThirds';
import { lessonRhythmWorkshop } from './lessonRhythmWorkshop';
import { lessonFourChordPop } from './lessonFourChordPop';
import { lessonMinorColours } from './lessonMinorColours';

export {
  nordicEmbers,
  fMinorArpeggio,
  cinematicPulse,
  bluesShuffle,
  classicPassacaglia,
  classicPassacagliaEasy,
  classicPassacagliaVar,
  classicBachPreludeC,
  classicFurElise,
  classicPachelbelCanon,
  lessonFiveFingerWeave,
  lessonFingerGymThirds,
  lessonRhythmWorkshop,
  lessonFourChordPop,
  lessonMinorColours,
};

export const CLASSIC_SONGS: Song[] = [
  nordicEmbers,
  fMinorArpeggio,
  cinematicPulse,
  bluesShuffle,
];

export const REPERTOIRE_SONGS: Song[] = [
  classicPassacaglia,
  classicPassacagliaEasy,
  classicPassacagliaVar,
  classicBachPreludeC,
  classicFurElise,
  classicPachelbelCanon,
];

export const LESSON_SONGS: Song[] = [
  lessonFiveFingerWeave,
  lessonFingerGymThirds,
  lessonRhythmWorkshop,
  lessonFourChordPop,
  lessonMinorColours,
];

export const SONGS: Song[] = [...CLASSIC_SONGS, ...REPERTOIRE_SONGS, ...LESSON_SONGS];

import { Song } from '../../types/midi';
import { nordicEmbers } from './nordicEmbers';
import { fMinorArpeggio } from './fMinorArpeggio';
import { cinematicPulse } from './cinematicPulse';
import { bluesShuffle } from './bluesShuffle';
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

export const LESSON_SONGS: Song[] = [
  lessonFiveFingerWeave,
  lessonFingerGymThirds,
  lessonRhythmWorkshop,
  lessonFourChordPop,
  lessonMinorColours,
];

export const SONGS: Song[] = [...CLASSIC_SONGS, ...LESSON_SONGS];

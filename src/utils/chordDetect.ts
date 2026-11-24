const DEFAULT_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const CHORD_PATTERNS: ReadonlyArray<readonly [string, readonly number[]]> = [
  ['', [0, 4, 7]],
  ['m', [0, 3, 7]],
  ['dim', [0, 3, 6]],
  ['aug', [0, 4, 8]],
  ['sus4', [0, 5, 7]],
  ['sus2', [0, 2, 7]],
  ['maj7', [0, 4, 7, 11]],
  ['m7', [0, 3, 7, 10]],
  ['7', [0, 4, 7, 10]],
  ['m7b5', [0, 3, 6, 10]],
  ['dim7', [0, 3, 6, 9]],
  ['7sus4', [0, 5, 7, 10]],
  ['6', [0, 4, 7, 9]],
  ['m6', [0, 3, 7, 9]],
  ['add9', [0, 2, 4, 7]],
  ['madd9', [0, 2, 3, 7]],
  ['m(maj7)', [0, 3, 7, 11]],
  ['maj9', [0, 2, 4, 7, 11]],
  ['m9', [0, 2, 3, 7, 10]],
  ['9', [0, 2, 4, 7, 10]],
];

export function shouldPreferFlats(symbol?: string | null): boolean {
  if (!symbol || symbol.includes('#')) return false;
  if (/^[A-G]b|\/[A-G]b/.test(symbol)) return true;
  return /^(Fm|Cm|Gm|Dm|F)(?:$|\/|6|7|maj|sus|add)/.test(symbol);
}

function matchesPattern(rootPc: number, pcs: Set<number>, intervals: readonly number[]): boolean {
  return intervals.length === pcs.size && intervals.every((iv) => pcs.has((rootPc + iv) % 12));
}

// INVARIANT: Pass 1 checks bassPc as root before slash inversions so root-position and symmetric chords stay deterministic.
export function detectChordName(midis: Iterable<number>, preferFlats = false): string | null {
  const sorted = Array.from(midis)
    .filter((m) => Number.isFinite(m))
    .map((m) => Math.round(m))
    .sort((a, b) => a - b);
  if (sorted.length < 3) return null;

  const bassPc = ((sorted[0] % 12) + 12) % 12;
  const pcs = new Set<number>();
  const orderedPcs: number[] = [];
  for (const m of sorted) {
    const pc = ((m % 12) + 12) % 12;
    if (!pcs.has(pc)) {
      pcs.add(pc);
      orderedPcs.push(pc);
    }
  }
  if (pcs.size < 3) return null;

  const names = preferFlats ? FLAT_NAMES : DEFAULT_NAMES;

  for (const [suffix, intervals] of CHORD_PATTERNS) {
    if (matchesPattern(bassPc, pcs, intervals)) {
      return `${names[bassPc]}${suffix}`;
    }
  }

  for (const [suffix, intervals] of CHORD_PATTERNS) {
    for (const rootPc of orderedPcs) {
      if (rootPc === bassPc) continue;
      if (matchesPattern(rootPc, pcs, intervals)) {
        return `${names[rootPc]}${suffix}/${names[bassPc]}`;
      }
    }
  }

  return null;
}

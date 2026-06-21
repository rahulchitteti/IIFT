import { describe, it, expect } from 'vitest';
import {
  band,
  computeMetrics,
  eligibility,
  roundPct,
  whatIf,
  sgpaImpact,
  type BandConfig,
} from './engine';
import { buildSeed } from './seed';
import type { Subject, Term } from './types';

const CFG: BandConfig = { safePct: 80, stepPct: 10, debarPct: 50 };

const seed = buildSeed();
const term3 = seed.terms.find((t) => t.name === '3rd Trimester')!;
const term2 = seed.terms.find((t) => t.name === '2nd Trimester')!;

function find(term: Term, name: string): Subject {
  const s = term.subjects.find((x) => x.name === name);
  if (!s) throw new Error(`subject not found: ${name}`);
  return s;
}

interface Expected {
  term: '3rd' | '2nd';
  name: string;
  P: number;
  A: number;
  held: number;
  total: number;
  capYet: number;
  bandLabel: string;
  mustAttend: number;
  canMiss: number;
}

// Straight from §9 acceptance table.
const TABLE: Expected[] = [
  { term: '3rd', name: 'IFM', P: 9, A: 4, held: 13, total: 13, capYet: 69, bandLabel: '−2 grade points', mustAttend: 2, canMiss: 0 },
  { term: '3rd', name: 'Economic Environment (EE)', P: 7, A: 5, held: 12, total: 13, capYet: 58, bandLabel: '−3 grade points', mustAttend: 4, canMiss: 0 },
  { term: '3rd', name: 'ITAM', P: 11, A: 5, held: 16, total: 20, capYet: 69, bandLabel: '−2 grade points', mustAttend: 5, canMiss: 0 },
  { term: '3rd', name: 'HRM', P: 9, A: 4, held: 13, total: 13, capYet: 69, bandLabel: '−2 grade points', mustAttend: 2, canMiss: 0 },
  { term: '3rd', name: 'SM', P: 10, A: 1, held: 11, total: 13, capYet: 91, bandLabel: 'Safe', mustAttend: 1, canMiss: 1 },
  { term: '3rd', name: 'OR', P: 8, A: 5, held: 13, total: 13, capYet: 62, bandLabel: '−2 grade points', mustAttend: 3, canMiss: 0 },
  { term: '3rd', name: 'OM', P: 8, A: 5, held: 13, total: 13, capYet: 62, bandLabel: '−2 grade points', mustAttend: 3, canMiss: 0 },
  { term: '2nd', name: 'ITOD', P: 14, A: 6, held: 20, total: 27, capYet: 70, bandLabel: '−1 grade point', mustAttend: 8, canMiss: 0 },
  { term: '2nd', name: 'International Economics', P: 13, A: 4, held: 17, total: 20, capYet: 76, bandLabel: '−1 grade point', mustAttend: 3, canMiss: 0 },
  { term: '2nd', name: 'BRM', P: 8, A: 12, held: 20, total: 20, capYet: 40, bandLabel: 'Debarred', mustAttend: 8, canMiss: 0 },
  { term: '2nd', name: 'CF', P: 10, A: 1, held: 11, total: 20, capYet: 91, bandLabel: 'Safe', mustAttend: 6, canMiss: 3 },
  { term: '2nd', name: 'IMM', P: 4, A: 8, held: 12, total: 20, capYet: 33, bandLabel: 'Debarred', mustAttend: 12, canMiss: 0 },
  { term: '2nd', name: 'OB', P: 6, A: 1, held: 7, total: 14, capYet: 86, bandLabel: 'Safe', mustAttend: 6, canMiss: 1 },
  { term: '2nd', name: 'Spanish', P: 6, A: 10, held: 16, total: 20, capYet: 38, bandLabel: 'Debarred', mustAttend: 10, canMiss: 0 },
];

describe('engine reproduces §9 acceptance table from seed', () => {
  for (const row of TABLE) {
    it(`${row.term} ${row.name}`, () => {
      const term = row.term === '3rd' ? term3 : term2;
      const s = find(term, row.name);
      const m = computeMetrics(s, CFG);
      expect(m.present, 'present').toBe(row.P);
      expect(m.absent, 'absent').toBe(row.A);
      expect(m.held, 'held').toBe(row.held);
      expect(m.total, 'total').toBe(row.total);
      expect(roundPct(m.capYet), 'capYet').toBe(row.capYet);
      expect(m.band.label, 'band').toBe(row.bandLabel);
      expect(m.mustAttend, 'mustAttend').toBe(row.mustAttend);
      expect(m.canMiss, 'canMiss').toBe(row.canMiss);
    });
  }
});

describe('band edges with defaults (80/10/50)', () => {
  const cases: Array<[number, string]> = [
    [80, 'Safe'],
    [79, '−1 grade point'],
    [70, '−1 grade point'],
    [69, '−2 grade points'],
    [60, '−2 grade points'],
    [59, '−3 grade points'],
    [50, '−3 grade points'],
    [49, 'Debarred'],
  ];
  for (const [pct, label] of cases) {
    it(`${pct} -> ${label}`, () => {
      expect(band(pct, CFG).label).toBe(label);
    });
  }

  it('null -> No classes yet', () => {
    expect(band(null, CFG).label).toBe('No classes yet');
  });

  it('debarred deduct is null', () => {
    expect(band(40, CFG).deduct).toBeNull();
  });
});

describe('exam eligibility', () => {
  it('BRM -> Cannot stay eligible', () => {
    const s = find(term2, 'BRM');
    const m = computeMetrics(s, CFG);
    expect(eligibility(m, CFG).label).toBe('Cannot stay eligible');
  });
  it('CF -> Exam eligible', () => {
    const s = find(term2, 'CF');
    const m = computeMetrics(s, CFG);
    expect(eligibility(m, CFG).label).toBe('Exam eligible');
  });
});

describe('what-if planner projects on final %', () => {
  it('CF: skipping all remaining still lands above safe', () => {
    const s = find(term2, 'CF');
    const m = computeMetrics(s, CFG);
    const w = whatIf(m, m.remaining, CFG);
    // present 10, total 20 => 50%
    expect(roundPct(w.projectedPct)).toBe(50);
    expect(w.attend).toBe(0);
  });
  it('CF: attending all remaining maximizes final %', () => {
    const s = find(term2, 'CF');
    const m = computeMetrics(s, CFG);
    const w = whatIf(m, 0, CFG);
    // (10 + 9) / 20 = 95%
    expect(roundPct(w.projectedPct)).toBe(95);
  });
  it('skip clamps to remaining', () => {
    const s = find(term2, 'CF');
    const m = computeMetrics(s, CFG);
    const w = whatIf(m, 999, CFG);
    expect(w.skip).toBe(m.remaining);
  });
});

describe('SGPA impact', () => {
  it('reports no data when expectedGP unset (seed default)', () => {
    expect(sgpaImpact(term3, CFG).hasData).toBe(false);
  });

  it('computes credit-weighted expected vs penalized SGPA', () => {
    // Build a small synthetic term: two subjects with credits + expectedGP.
    const t: Term = {
      id: 't',
      name: 'x',
      archived: false,
      subjects: [
        {
          ...find(term3, 'SM'), // capYet 91 -> Safe -> no deduct
          credits: 3,
          expectedGP: 9,
        },
        {
          ...find(term3, 'IFM'), // capYet 69 -> -2
          credits: 2,
          expectedGP: 8,
        },
      ],
    };
    const r = sgpaImpact(t, CFG);
    expect(r.hasData).toBe(true);
    // expected = (3*9 + 2*8)/5 = 43/5 = 8.6
    expect(r.expectedSGPA).toBeCloseTo(8.6, 5);
    // penalized = (3*9 + 2*6)/5 = 39/5 = 7.8
    expect(r.penalizedSGPA).toBeCloseTo(7.8, 5);
    expect(r.delta).toBeCloseTo(0.8, 5);
  });
});

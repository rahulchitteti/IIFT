// Pure domain logic. NO UI imports here so it can be unit-tested directly.
import type { Status, ClassEntry, Subject, Term, Prefs } from './types';

// ---------------------------------------------------------------------------
// Status classification
// ---------------------------------------------------------------------------

export const PRESENT_STATUSES: Status[] = ['P', 'L', 'OD'];
export const ABSENT_STATUSES: Status[] = ['A'];
export const EXCLUDED_STATUSES: Status[] = ['M', 'C', 'H'];

export const STATUS_LABELS: Record<Status, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Late',
  OD: 'On-Duty',
  M: 'Medical',
  C: 'Cancelled',
  H: 'Holiday',
};

export const STATUS_ORDER: Status[] = ['P', 'A', 'L', 'OD', 'M', 'C', 'H'];

export function countsAsPresent(s: Status): boolean {
  return PRESENT_STATUSES.includes(s);
}
export function countsAsAbsent(s: Status): boolean {
  return ABSENT_STATUSES.includes(s);
}
export function isExcluded(s: Status): boolean {
  return EXCLUDED_STATUSES.includes(s);
}

// ---------------------------------------------------------------------------
// Grade band
// ---------------------------------------------------------------------------

export interface BandConfig {
  safePct: number;
  stepPct: number;
  debarPct: number;
}

export interface Band {
  label: string;
  deduct: number | null; // null => debarred
  kind: 'none' | 'safe' | 'penalty' | 'debarred';
}

/**
 * Grade-point band for a given attendance percentage.
 * Defaults (80/10/50) reproduce: 80->Safe, 79->-1, 70->-1, 69->-2,
 * 60->-2, 59->-3, 50->-3, 49->Debarred.
 */
export function band(pct: number | null, cfg: BandConfig): Band {
  const { safePct, stepPct, debarPct } = cfg;
  if (pct == null) return { label: 'No classes yet', deduct: 0, kind: 'none' };
  if (pct < debarPct) return { label: 'Debarred', deduct: null, kind: 'debarred' };
  if (pct >= safePct) return { label: 'Safe', deduct: 0, kind: 'safe' };
  const deduct = Math.ceil((safePct - pct) / stepPct);
  return {
    label: `−${deduct} grade point${deduct === 1 ? '' : 's'}`,
    deduct,
    kind: 'penalty',
  };
}

// ---------------------------------------------------------------------------
// Per-subject metrics
// ---------------------------------------------------------------------------

export interface SubjectMetrics {
  present: number;
  absent: number;
  excluded: number;
  held: number;
  total: number;
  remaining: number;
  capYet: number | null; // attendance among classes held (headline %)
  capAll: number | null; // final % if you skip ALL remaining
  best: number | null; // final % if you attend ALL remaining
  mustAttend: number;
  reachable: boolean;
  canMiss: number;
  threshold: number; // effective threshold used
  band: Band; // live band, based on capYet
}

function tally(classes: ClassEntry[]) {
  let present = 0;
  let absent = 0;
  let excluded = 0;
  for (const c of classes) {
    if (countsAsPresent(c.status)) present++;
    else if (countsAsAbsent(c.status)) absent++;
    else excluded++;
  }
  return { present, absent, excluded };
}

export function computeMetrics(
  subject: Pick<Subject, 'classes' | 'totalPlanned' | 'threshold'>,
  cfg: BandConfig,
): SubjectMetrics {
  const { present, absent, excluded } = tally(subject.classes);
  const held = present + absent;
  const total = Math.max(subject.totalPlanned, held);
  const remaining = Math.max(0, total - held);

  const th = subject.threshold ?? cfg.safePct;

  const capYet = held > 0 ? (present / held) * 100 : null;
  const capAll = total > 0 ? (present / total) * 100 : null;
  const best = total > 0 ? ((present + remaining) / total) * 100 : null;

  const mustAttend = Math.max(0, Math.ceil((th / 100) * total) - present);
  const reachable = mustAttend <= remaining;
  const canMiss = Math.max(
    0,
    Math.min(remaining, Math.floor(((100 - th) / 100) * total) - absent),
  );

  return {
    present,
    absent,
    excluded,
    held,
    total,
    remaining,
    capYet,
    capAll,
    best,
    mustAttend,
    reachable,
    canMiss,
    threshold: th,
    band: band(capYet, cfg),
  };
}

// ---------------------------------------------------------------------------
// Exam eligibility badge
// ---------------------------------------------------------------------------

export type EligibilityKind = 'none' | 'eligible' | 'risk' | 'cannot';

export interface Eligibility {
  kind: EligibilityKind;
  label: string;
}

export function eligibility(m: SubjectMetrics, cfg: BandConfig): Eligibility {
  if (m.held === 0) return { kind: 'none', label: '' };
  if ((m.best ?? 0) < cfg.debarPct)
    return { kind: 'cannot', label: 'Cannot stay eligible' };
  if ((m.capAll ?? 0) < cfg.debarPct)
    return { kind: 'risk', label: 'Eligibility at risk' };
  return { kind: 'eligible', label: 'Exam eligible' };
}

// ---------------------------------------------------------------------------
// What-if planner: skip the next N of the remaining classes
// ---------------------------------------------------------------------------

export interface WhatIf {
  skip: number;
  attend: number;
  projectedPct: number | null;
  band: Band;
}

export function whatIf(m: SubjectMetrics, skip: number, cfg: BandConfig): WhatIf {
  const clampedSkip = Math.max(0, Math.min(m.remaining, skip));
  const attend = m.remaining - clampedSkip;
  const projectedPct =
    m.total > 0 ? ((m.present + attend) / m.total) * 100 : null;
  return {
    skip: clampedSkip,
    attend,
    projectedPct,
    band: band(projectedPct, cfg),
  };
}

// ---------------------------------------------------------------------------
// Plain-English verdict
// ---------------------------------------------------------------------------

export function verdict(m: SubjectMetrics): string {
  if (m.held === 0) return 'No classes logged yet.';
  const th = m.threshold;
  if (m.band.kind === 'debarred') {
    if (m.reachable && m.mustAttend > 0) {
      return `Debarred at current pace. Attend ${m.mustAttend} of ${m.remaining} remaining to recover to ${th}%.`;
    }
    return `Below ${th}% with no way back to ${th}% this term.`;
  }
  if (m.band.kind === 'safe' || (m.capYet ?? 0) >= th) {
    if (m.canMiss > 0) {
      return `Safe — you can miss ${m.canMiss} more and still finish at ${th}%.`;
    }
    return `Safe for now — attend the rest to stay at ${th}%.`;
  }
  // penalty band
  if (m.reachable && m.mustAttend > 0) {
    return `Attend ${m.mustAttend} of ${m.remaining} remaining to finish at ${th}%.`;
  }
  if (m.mustAttend === 0) {
    return `On track to finish at ${th}% if you attend the rest.`;
  }
  return `Can't reach ${th}% this term — ${m.band.label} likely.`;
}

// ---------------------------------------------------------------------------
// Trend: cumulative attendance % after each held class (in class order)
// ---------------------------------------------------------------------------

export function trend(subject: Pick<Subject, 'classes'>): number[] {
  const pts: number[] = [];
  let present = 0;
  let held = 0;
  for (const c of subject.classes) {
    if (countsAsPresent(c.status)) {
      present++;
      held++;
    } else if (countsAsAbsent(c.status)) {
      held++;
    } else {
      continue; // excluded classes don't move the trend
    }
    pts.push((present / held) * 100);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// SGPA impact (across an active term)
// ---------------------------------------------------------------------------

export interface SgpaImpact {
  hasData: boolean;
  expectedSGPA: number | null;
  penalizedSGPA: number | null;
  delta: number; // expected - penalized (>= 0 means attendance costs you this much)
  rows: Array<{
    subjectId: string;
    name: string;
    credits: number;
    expectedGP: number;
    penalizedGP: number;
    deduct: number;
  }>;
}

export function sgpaImpact(term: Term, cfg: BandConfig): SgpaImpact {
  const rows: SgpaImpact['rows'] = [];
  let wExpected = 0;
  let wPenalized = 0;
  let credits = 0;

  for (const s of term.subjects) {
    if (s.credits > 0 && s.expectedGP != null) {
      const m = computeMetrics(s, cfg);
      const deduct = m.band.deduct ?? 0;
      const penalizedGP = Math.max(0, s.expectedGP - deduct);
      wExpected += s.credits * s.expectedGP;
      wPenalized += s.credits * penalizedGP;
      credits += s.credits;
      rows.push({
        subjectId: s.id,
        name: s.name,
        credits: s.credits,
        expectedGP: s.expectedGP,
        penalizedGP,
        deduct,
      });
    }
  }

  if (credits === 0) {
    return {
      hasData: false,
      expectedSGPA: null,
      penalizedSGPA: null,
      delta: 0,
      rows,
    };
  }
  const expectedSGPA = wExpected / credits;
  const penalizedSGPA = wPenalized / credits;
  return {
    hasData: true,
    expectedSGPA,
    penalizedSGPA,
    delta: expectedSGPA - penalizedSGPA,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Term-level aggregates
// ---------------------------------------------------------------------------

export interface TermSummary {
  subjectCount: number;
  overallPct: number | null; // credit-weighted when prefs say so
  atRisk: number; // subjects below safe %
  gradePointsAtRisk: number; // sum of deducts (debarred counts as a big hit)
  debarred: number;
}

export function termSummary(
  term: Term,
  prefs: Prefs,
): TermSummary {
  const cfg = bandConfig(prefs);
  let wPresent = 0;
  let wHeld = 0;
  let sumPresent = 0;
  let sumHeld = 0;
  let atRisk = 0;
  let gradePointsAtRisk = 0;
  let debarred = 0;

  for (const s of term.subjects) {
    const m = computeMetrics(s, cfg);
    const weight = prefs.creditWeighted ? Math.max(0, s.credits) : 1;
    if (m.held > 0) {
      wPresent += m.present * weight;
      wHeld += m.held * weight;
      sumPresent += m.present;
      sumHeld += m.held;
    }
    if (m.capYet != null && m.capYet < cfg.safePct) atRisk++;
    if (m.band.kind === 'debarred') debarred++;
    if (m.band.deduct != null) gradePointsAtRisk += m.band.deduct;
  }

  let overallPct: number | null = null;
  if (prefs.creditWeighted) {
    overallPct = wHeld > 0 ? (wPresent / wHeld) * 100 : null;
  } else {
    overallPct = sumHeld > 0 ? (sumPresent / sumHeld) * 100 : null;
  }

  return {
    subjectCount: term.subjects.length,
    overallPct,
    atRisk,
    gradePointsAtRisk,
    debarred,
  };
}

// ---------------------------------------------------------------------------
// Sorting subjects by urgency (most urgent first)
// ---------------------------------------------------------------------------

export function urgencyScore(m: SubjectMetrics): number {
  // Higher = more urgent. Debarred is most urgent, then by how far below safe.
  if (m.held === 0) return -1;
  if (m.band.kind === 'debarred') return 1000 + (m.threshold - (m.capYet ?? 0));
  if (m.band.kind === 'penalty')
    return 500 + (m.threshold - (m.capYet ?? 0));
  // safe: less urgent, but lower canMiss is slightly more urgent
  return 100 - (m.capYet ?? 0);
}

export function bandConfig(prefs: Prefs): BandConfig {
  return {
    safePct: prefs.safePct,
    stepPct: prefs.stepPct,
    debarPct: prefs.debarPct,
  };
}

// ---------------------------------------------------------------------------
// Rounding helper used by the UI / tests (nearest %)
// ---------------------------------------------------------------------------

export function roundPct(pct: number | null): number | null {
  if (pct == null) return null;
  return Math.round(pct);
}

// Seed data preloaded so the app opens populated and verifiable against §9.
import type { AppData, ClassEntry, Status, Subject, Term } from './types';
import { uid } from './id';

const PALETTE = [
  '#4338CA', // indigo
  '#0e9f6e', // green
  '#c2710c', // amber
  '#d4451f', // orange-red
  '#2563eb', // blue
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#be185d', // pink
  '#15803d', // emerald
  '#b45309', // brown-amber
];

let colorIdx = 0;
function nextColor(): string {
  const c = PALETTE[colorIdx % PALETTE.length];
  colorIdx++;
  return c;
}

/** Expand a marks string like "P P A P" into class entries for one faculty. */
function marks(faculty: string, spec: string): ClassEntry[] {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => {
      const status = m.toUpperCase() as Status;
      const entry: ClassEntry = {
        id: uid('cls'),
        status,
        faculty,
        date: null, // seed marks are in session order, no specific dates
        note: '',
      };
      return entry;
    });
}

interface SeedSubjectInput {
  name: string;
  credits: number;
  totalPlanned: number;
  byFaculty: Array<{ faculty: string; spec: string }>;
}

function makeSubject(input: SeedSubjectInput): Subject {
  const classes = input.byFaculty.flatMap((f) => marks(f.faculty, f.spec));
  return {
    id: uid('subj'),
    name: input.name,
    credits: input.credits,
    totalPlanned: input.totalPlanned,
    threshold: null,
    expectedGP: null,
    color: nextColor(),
    faculties: input.byFaculty.map((f) => f.faculty),
    schedule: [],
    classes,
  };
}

export function buildSeed(): AppData {
  colorIdx = 0;

  const third: Term = {
    id: uid('term'),
    name: '3rd Trimester',
    archived: false,
    subjects: [
      makeSubject({
        name: 'IFM',
        credits: 2,
        totalPlanned: 13,
        byFaculty: [
          { faculty: 'Dr. Jayanta Kumar Seal', spec: 'P P P P P P P P A A A A P' },
        ],
      }),
      makeSubject({
        name: 'Economic Environment (EE)',
        credits: 2,
        totalPlanned: 13,
        byFaculty: [
          { faculty: 'Taufeeq A', spec: 'P A A P P' },
          { faculty: 'Anirban B', spec: 'P P' },
          { faculty: 'Debashish C', spec: 'P A A A P' },
        ],
      }),
      makeSubject({
        name: 'ITAM',
        credits: 3,
        totalPlanned: 20,
        byFaculty: [
          { faculty: 'Dr. Bhaskar Basu', spec: 'P P P P P P P P P P P A A A A A' },
        ],
      }),
      makeSubject({
        name: 'HRM',
        credits: 2,
        totalPlanned: 13,
        byFaculty: [
          { faculty: 'Dr. Naman Sharma', spec: 'P P P A P P P P A P P A A' },
        ],
      }),
      makeSubject({
        name: 'SM',
        credits: 2,
        totalPlanned: 13,
        byFaculty: [
          { faculty: 'Dr. K. Rangarajan', spec: 'P P P P P A P P P P P' },
        ],
      }),
      makeSubject({
        name: 'OR',
        credits: 2,
        totalPlanned: 13,
        byFaculty: [
          { faculty: 'Dr. Saurav Dash', spec: 'P P P P A A P P A A P P A' },
        ],
      }),
      makeSubject({
        name: 'OM',
        credits: 2,
        totalPlanned: 13,
        byFaculty: [
          { faculty: 'Dr. Manimay Ghosh', spec: 'P P P P P P P A A A A P A' },
        ],
      }),
    ],
  };

  const second: Term = {
    id: uid('term'),
    name: '2nd Trimester',
    archived: false,
    subjects: [
      makeSubject({
        name: 'ITOD',
        credits: 0,
        totalPlanned: 27,
        byFaculty: [
          { faculty: 'Deepankar Sinha', spec: 'A P P A P P P A' },
          { faculty: 'Raghuveer Negi', spec: 'P P P P P A A P P' },
          { faculty: 'Rana Goswami', spec: 'A P P' },
        ],
      }),
      makeSubject({
        name: 'International Economics',
        credits: 0,
        totalPlanned: 20,
        byFaculty: [
          { faculty: 'Ranajoy B', spec: 'P P P P P P P' },
          { faculty: 'Debashish C', spec: 'P P A A A A' },
          { faculty: 'Anirban B', spec: 'P P P P' },
        ],
      }),
      makeSubject({
        name: 'BRM',
        credits: 0,
        totalPlanned: 20,
        byFaculty: [
          {
            faculty: 'Bijoy Talukdar',
            spec: 'P P P P P P P A A A A P A A A A A A A A',
          },
        ],
      }),
      makeSubject({
        name: 'CF',
        credits: 0,
        totalPlanned: 20,
        byFaculty: [{ faculty: 'T.P Ghosh', spec: 'P P A P P P P P P P P' }],
      }),
      makeSubject({
        name: 'IMM',
        credits: 0,
        totalPlanned: 20,
        byFaculty: [
          { faculty: 'Dr. Sunil George Mathew', spec: 'A P A P P P A A A A A A' },
        ],
      }),
      makeSubject({
        name: 'OB',
        credits: 0,
        totalPlanned: 14,
        byFaculty: [{ faculty: 'Dr. M. Venkatesan', spec: 'A P P P P P P' }],
      }),
      makeSubject({
        name: 'Spanish',
        credits: 0,
        totalPlanned: 20,
        byFaculty: [
          { faculty: 'Biswajeet Saha', spec: 'P P P P A P P A A A A A A A A A' },
        ],
      }),
    ],
  };

  return {
    version: CURRENT_VERSION,
    activeTab: 'subjects',
    activeTermId: third.id,
    prefs: defaultPrefs(),
    holidays: [],
    terms: [third, second],
  };
}

export const CURRENT_VERSION = 2;

export function defaultPrefs() {
  return {
    theme: 'auto' as const,
    safePct: 80,
    stepPct: 10,
    debarPct: 50,
    creditWeighted: false,
    reminders: {
      enabled: false,
      dailyNudge: '18:00',
      danger: true,
      weekly: false,
    },
  };
}

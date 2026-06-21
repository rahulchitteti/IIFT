// Tiny typed persistence wrapper: single localStorage key, JSON-serialized,
// with an in-memory fallback if storage throws (private mode / quota / SSR).
import type { AppData, Prefs, Subject, Term } from './types';
import { buildSeed, CURRENT_VERSION, defaultPrefs } from './seed';

export const STORAGE_KEY = 'attendance.v2';
// Older keys we migrate forward from (most recent first).
const LEGACY_KEYS = ['attendance.v1', 'attendance', 'trimester-attendance'];

let memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return key in memoryStore ? memoryStore[key] : null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore[key] = value;
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    delete memoryStore[key];
  }
}

// --- migration -------------------------------------------------------------

function migratePrefs(p: Partial<Prefs> | undefined): Prefs {
  const d = defaultPrefs();
  if (!p) return d;
  return {
    theme: p.theme ?? d.theme,
    safePct: p.safePct ?? d.safePct,
    stepPct: p.stepPct ?? d.stepPct,
    debarPct: p.debarPct ?? d.debarPct,
    creditWeighted: p.creditWeighted ?? d.creditWeighted,
    reminders: {
      enabled: p.reminders?.enabled ?? d.reminders.enabled,
      dailyNudge: p.reminders?.dailyNudge ?? d.reminders.dailyNudge,
      danger: p.reminders?.danger ?? d.reminders.danger,
      weekly: p.reminders?.weekly ?? d.reminders.weekly,
    },
  };
}

function migrateSubject(s: Partial<Subject>): Subject {
  return {
    id: s.id ?? cryptoId('subj'),
    name: s.name ?? 'Untitled',
    credits: typeof s.credits === 'number' ? s.credits : 0,
    totalPlanned: typeof s.totalPlanned === 'number' ? s.totalPlanned : 0,
    threshold: s.threshold ?? null,
    expectedGP: s.expectedGP ?? null,
    color: s.color ?? '#4338CA',
    faculties: Array.isArray(s.faculties) ? s.faculties : [],
    schedule: Array.isArray(s.schedule) ? s.schedule : [],
    classes: Array.isArray(s.classes)
      ? s.classes.map((c) => ({
          id: c.id ?? cryptoId('cls'),
          status: c.status ?? 'P',
          faculty: c.faculty ?? '',
          date: c.date ?? null,
          note: c.note ?? '',
        }))
      : [],
  };
}

function migrateTerm(t: Partial<Term>): Term {
  return {
    id: t.id ?? cryptoId('term'),
    name: t.name ?? 'Trimester',
    archived: !!t.archived,
    subjects: Array.isArray(t.subjects) ? t.subjects.map(migrateSubject) : [],
  };
}

/** Bring any older/partial shape up to the current AppData shape. */
export function migrate(raw: unknown): AppData {
  const seed = buildSeed();
  if (!raw || typeof raw !== 'object') return seed;
  const data = raw as Partial<AppData>;
  const terms = Array.isArray(data.terms) ? data.terms.map(migrateTerm) : seed.terms;
  return {
    version: CURRENT_VERSION,
    activeTab: data.activeTab ?? 'subjects',
    activeTermId:
      data.activeTermId && terms.some((t) => t.id === data.activeTermId)
        ? data.activeTermId
        : terms.find((t) => !t.archived)?.id ?? terms[0]?.id,
    prefs: migratePrefs(data.prefs),
    holidays: Array.isArray(data.holidays) ? data.holidays : [],
    terms,
  };
}

function cryptoId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- public API ------------------------------------------------------------

export function load(): AppData {
  const current = safeGet(STORAGE_KEY);
  if (current) {
    try {
      return migrate(JSON.parse(current));
    } catch {
      /* fall through to legacy / seed */
    }
  }
  // Try migrating from legacy keys (preserve logged classes rather than wiping).
  for (const key of LEGACY_KEYS) {
    const legacy = safeGet(key);
    if (legacy) {
      try {
        const migrated = migrate(JSON.parse(legacy));
        save(migrated);
        return migrated;
      } catch {
        /* try next */
      }
    }
  }
  const seed = buildSeed();
  save(seed);
  return seed;
}

export function save(data: AppData): void {
  safeSet(STORAGE_KEY, JSON.stringify(data));
}

export function resetToSeed(): AppData {
  const seed = buildSeed();
  save(seed);
  return seed;
}

export function exportJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJSON(text: string): AppData {
  return migrate(JSON.parse(text));
}

/** Test/utility hook to clear the in-memory fallback. */
export function __clearMemory(): void {
  memoryStore = {};
  safeRemove(STORAGE_KEY);
}

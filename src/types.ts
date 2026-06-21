// Domain data model. Kept free of any UI imports so the engine stays pure.

export type Status = 'P' | 'A' | 'L' | 'OD' | 'M' | 'C' | 'H';

export interface ClassEntry {
  id: string;
  status: Status;
  faculty: string;
  date: string | null; // YYYY-MM-DD (local), or null when unscheduled
  note: string;
}

export interface ScheduleSlot {
  day: number; // 0=Sun .. 6=Sat
  time: string; // e.g. "09:30"
  faculty: string;
}

export interface Subject {
  id: string;
  name: string;
  credits: number;
  totalPlanned: number;
  threshold: number | null; // null => use global safePct
  expectedGP: number | null; // for SGPA calc
  color: string; // accent/tag color
  faculties: string[];
  schedule: ScheduleSlot[];
  classes: ClassEntry[];
}

export interface Term {
  id: string;
  name: string;
  archived: boolean;
  subjects: Subject[];
}

export interface Reminders {
  enabled: boolean;
  dailyNudge: string; // "HH:MM"
  danger: boolean;
  weekly: boolean;
}

export interface Prefs {
  theme: 'auto' | 'light' | 'dark';
  safePct: number;
  stepPct: number;
  debarPct: number;
  creditWeighted: boolean; // weight overall % by credits
  reminders: Reminders;
}

export interface AppData {
  version: number;
  activeTab: string;
  activeTermId?: string;
  prefs: Prefs;
  holidays: string[]; // YYYY-MM-DD
  terms: Term[];
}

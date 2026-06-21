import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  ClassEntry,
  Prefs,
  ScheduleSlot,
  Status,
  Subject,
  Term,
} from '../types';
import * as storage from '../storage';
import { buildSeed } from '../seed';
import { uid } from '../id';
import { addDays, dowOf, todayISO } from '../dates';

interface Toast {
  message: string;
  undo?: () => void;
}

interface StoreApi {
  data: AppData;
  activeTerm: Term | undefined;
  toast: Toast | null;
  dismissToast: () => void;

  // generic
  mutate: (fn: (d: AppData) => void, undoMessage?: string) => void;
  replaceAll: (data: AppData, message?: string) => void;

  // prefs
  setPrefs: (patch: Partial<Prefs>) => void;
  setActiveTab: (tab: string) => void;

  // terms
  setActiveTerm: (id: string) => void;
  addTerm: (name: string) => void;
  renameTerm: (id: string, name: string) => void;
  toggleArchiveTerm: (id: string) => void;
  cloneTerm: (id: string) => void;
  deleteTerm: (id: string) => void;
  generateFromTimetable: (termId: string, start: string, end: string) => number;

  // subjects
  addSubject: (termId: string, subject: Subject) => void;
  updateSubject: (termId: string, subject: Subject) => void;
  deleteSubject: (termId: string, subjectId: string) => void;

  // classes
  markToday: (termId: string, subjectId: string, status: Status, faculty: string) => void;
  addClass: (termId: string, subjectId: string, cls: ClassEntry) => void;
  updateClass: (termId: string, subjectId: string, cls: ClassEntry) => void;
  deleteClass: (termId: string, subjectId: string, classId: string) => void;

  // schedule
  setSchedule: (termId: string, subjectId: string, schedule: ScheduleSlot[]) => void;

  // holidays
  toggleHoliday: (date: string) => void;

  // reset
  resetToSeed: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function findTerm(d: AppData, id: string): Term | undefined {
  return d.terms.find((t) => t.id === id);
}
function findSubject(d: AppData, termId: string, subjectId: string): Subject | undefined {
  return findTerm(d, termId)?.subjects.find((s) => s.id === subjectId);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => storage.load());
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  // persist on every change
  useEffect(() => {
    storage.save(data);
  }, [data]);

  // apply theme to <html>
  useEffect(() => {
    const apply = () => {
      const t = data.prefs.theme;
      const dark =
        t === 'dark' ||
        (t === 'auto' &&
          window.matchMedia?.('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0b1020' : '#4338CA');
    };
    apply();
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mq && data.prefs.theme === 'auto') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [data.prefs.theme]);

  function showToast(message: string, undo?: () => void) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }

  function dismissToast() {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  }

  // The heart of undo: snapshot prior state, apply mutation, offer to restore.
  function mutate(fn: (d: AppData) => void, undoMessage?: string) {
    setData((prev) => {
      const prevSnapshot = prev;
      const next = clone(prev);
      fn(next);
      if (undoMessage) {
        showToast(undoMessage, () => {
          setData(prevSnapshot);
          dismissToast();
        });
      }
      return next;
    });
  }

  function replaceAll(newData: AppData, message?: string) {
    setData((prev) => {
      const snap = prev;
      if (message) showToast(message, () => setData(snap));
      return newData;
    });
  }

  const api: StoreApi = useMemo(() => {
    return {
      data,
      activeTerm: data.terms.find((t) => t.id === data.activeTermId),
      toast,
      dismissToast,
      mutate,
      replaceAll,

      setPrefs: (patch) =>
        mutate((d) => {
          d.prefs = { ...d.prefs, ...patch };
        }),

      setActiveTab: (tab) =>
        setData((d) => (d.activeTab === tab ? d : { ...d, activeTab: tab })),

      setActiveTerm: (id) => setData((d) => ({ ...d, activeTermId: id })),

      addTerm: (name) =>
        mutate((d) => {
          const t: Term = { id: uid('term'), name, archived: false, subjects: [] };
          d.terms.unshift(t);
          d.activeTermId = t.id;
        }, `Added “${name}”`),

      renameTerm: (id, name) =>
        mutate((d) => {
          const t = findTerm(d, id);
          if (t) t.name = name;
        }, 'Renamed trimester'),

      toggleArchiveTerm: (id) =>
        mutate((d) => {
          const t = findTerm(d, id);
          if (t) t.archived = !t.archived;
        }, 'Updated trimester'),

      cloneTerm: (id) =>
        mutate((d) => {
          const src = findTerm(d, id);
          if (!src) return;
          const copy: Term = {
            id: uid('term'),
            name: `${src.name} (copy)`,
            archived: false,
            subjects: src.subjects.map((s) => ({
              ...clone(s),
              id: uid('subj'),
              classes: [], // copies subjects + faculty + timetable, no classes
            })),
          };
          d.terms.unshift(copy);
          d.activeTermId = copy.id;
        }, 'Cloned trimester'),

      deleteTerm: (id) =>
        mutate((d) => {
          d.terms = d.terms.filter((t) => t.id !== id);
          if (d.activeTermId === id) {
            d.activeTermId = d.terms.find((t) => !t.archived)?.id ?? d.terms[0]?.id;
          }
        }, 'Deleted trimester'),

      generateFromTimetable: (termId, start, end) => {
        let created = 0;
        mutate((d) => {
          const t = findTerm(d, termId);
          if (!t) return;
          const holidays = new Set(d.holidays);
          let cur = start;
          let guard = 0;
          while (cur <= end && guard < 2000) {
            if (!holidays.has(cur)) {
              const dow = dowOf(cur);
              for (const s of t.subjects) {
                for (const slot of s.schedule) {
                  if (slot.day !== dow) continue;
                  const exists = s.classes.some(
                    (c) => c.date === cur && c.faculty === slot.faculty,
                  );
                  if (!exists) {
                    s.classes.push({
                      id: uid('cls'),
                      status: 'P',
                      faculty: slot.faculty,
                      date: cur,
                      note: '',
                    });
                    created++;
                  }
                }
              }
            }
            cur = addDays(cur, 1);
            guard++;
          }
        }, 'Generated classes');
        return created;
      },

      addSubject: (termId, subject) =>
        mutate((d) => {
          findTerm(d, termId)?.subjects.push(subject);
        }, `Added “${subject.name}”`),

      updateSubject: (termId, subject) =>
        mutate((d) => {
          const t = findTerm(d, termId);
          if (!t) return;
          const i = t.subjects.findIndex((s) => s.id === subject.id);
          if (i >= 0) t.subjects[i] = subject;
        }, 'Updated subject'),

      deleteSubject: (termId, subjectId) =>
        mutate((d) => {
          const t = findTerm(d, termId);
          if (t) t.subjects = t.subjects.filter((s) => s.id !== subjectId);
        }, 'Deleted subject'),

      markToday: (termId, subjectId, status, faculty) =>
        mutate((d) => {
          const s = findSubject(d, termId, subjectId);
          if (!s) return;
          const today = todayISO();
          const existing = s.classes.find(
            (c) => c.date === today && (c.faculty === faculty || !faculty),
          );
          if (existing) existing.status = status;
          else
            s.classes.push({
              id: uid('cls'),
              status,
              faculty: faculty || s.faculties[0] || '',
              date: today,
              note: '',
            });
        }, 'Marked class'),

      addClass: (termId, subjectId, cls) =>
        mutate((d) => {
          findSubject(d, termId, subjectId)?.classes.push(cls);
        }, 'Added class'),

      updateClass: (termId, subjectId, cls) =>
        mutate((d) => {
          const s = findSubject(d, termId, subjectId);
          if (!s) return;
          const i = s.classes.findIndex((c) => c.id === cls.id);
          if (i >= 0) s.classes[i] = cls;
        }, 'Updated class'),

      deleteClass: (termId, subjectId, classId) =>
        mutate((d) => {
          const s = findSubject(d, termId, subjectId);
          if (s) s.classes = s.classes.filter((c) => c.id !== classId);
        }, 'Deleted class'),

      setSchedule: (termId, subjectId, schedule) =>
        mutate((d) => {
          const s = findSubject(d, termId, subjectId);
          if (s) s.schedule = schedule;
        }, 'Updated timetable'),

      toggleHoliday: (date) =>
        mutate((d) => {
          if (d.holidays.includes(date))
            d.holidays = d.holidays.filter((x) => x !== date);
          else d.holidays.push(date);
        }, 'Updated holiday'),

      resetToSeed: () => replaceAll(buildSeed(), 'Reset to seed'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, toast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

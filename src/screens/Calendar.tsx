import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import {
  countsAsAbsent,
  countsAsPresent,
  STATUS_LABELS,
} from '../engine';
import type { ClassEntry, Subject } from '../types';
import { Sheet, StatusBadge } from '../components/ui';
import { ClassForm } from './ClassForm';
import {
  localISO,
  MONTH_LONG,
  parseISO,
  prettyDate,
  todayISO,
  WEEKDAY_SHORT,
} from '../dates';

interface DayClass {
  subject: Subject;
  cls: ClassEntry;
}

export function CalendarScreen() {
  const store = useStore();
  const { data } = store;
  const term = store.activeTerm ?? data.terms.find((t) => !t.archived);
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = parseISO(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DayClass | null>(null);

  // map date -> classes (across active term)
  const byDate = useMemo(() => {
    const map = new Map<string, DayClass[]>();
    if (term) {
      for (const s of term.subjects) {
        for (const c of s.classes) {
          if (!c.date) continue;
          if (!map.has(c.date)) map.set(c.date, []);
          map.get(c.date)!.push({ subject: s, cls: c });
        }
      }
    }
    return map;
  }, [term]);

  const holidays = new Set(data.holidays);

  // build the grid (6 weeks)
  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const gridStart = new Date(cursor.y, cursor.m, 1 - startDow);
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(localISO(d));
  }

  function shift(delta: number) {
    setCursor((c) => {
      const m = c.m + delta;
      const y = c.y + Math.floor(m / 12);
      const mm = ((m % 12) + 12) % 12;
      return { y, m: mm };
    });
  }

  const selectedClasses = selected ? byDate.get(selected) ?? [] : [];

  return (
    <>
      <header className="app-header">
        <h1>Calendar</h1>
        <div className="sub">{term?.name ?? 'No active trimester'}</div>
      </header>

      <div className="screen">
        <div className="row between" style={{ marginBottom: 10 }}>
          <button className="btn sm ghost" onClick={() => shift(-1)} aria-label="previous month">
            ‹
          </button>
          <b>
            {MONTH_LONG[cursor.m]} {cursor.y}
          </b>
          <button className="btn sm ghost" onClick={() => shift(1)} aria-label="next month">
            ›
          </button>
        </div>

        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {WEEKDAY_SHORT.map((d) => (
            <div className="cal-dow" key={d}>
              {d}
            </div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((date) => {
            const inMonth = parseISO(date).getMonth() === cursor.m;
            const dayClasses = byDate.get(date) ?? [];
            let p = 0;
            let a = 0;
            let e = 0;
            for (const dc of dayClasses) {
              if (countsAsPresent(dc.cls.status)) p++;
              else if (countsAsAbsent(dc.cls.status)) a++;
              else e++;
            }
            const isHoliday = holidays.has(date);
            return (
              <button
                key={date}
                className={`cal-day${inMonth ? '' : ' out'}${
                  date === today ? ' today' : ''
                }${isHoliday ? ' holiday' : ''}`}
                onClick={() => setSelected(date)}
              >
                <span>{parseISO(date).getDate()}</span>
                <span className="cal-pips">
                  {p > 0 && <span className="pip p" title={`${p} present`} />}
                  {a > 0 && <span className="pip a" title={`${a} absent`} />}
                  {e > 0 && <span className="pip e" title={`${e} excused`} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="row" style={{ gap: 14, marginTop: 12, fontSize: 12 }}>
          <span>
            <span className="pip p" style={{ display: 'inline-block', marginRight: 4 }} /> present
          </span>
          <span>
            <span className="pip a" style={{ display: 'inline-block', marginRight: 4 }} /> absent
          </span>
          <span>
            <span className="pip e" style={{ display: 'inline-block', marginRight: 4 }} /> excused
          </span>
        </div>
      </div>

      {selected && (
        <Sheet title={prettyDate(selected)} onClose={() => setSelected(null)}>
          <div className="switch">
            <span>Mark this day as a holiday</span>
            <input
              type="checkbox"
              checked={holidays.has(selected)}
              onChange={() => store.toggleHoliday(selected)}
              aria-label="toggle holiday"
            />
          </div>
          <hr className="div" />
          {selectedClasses.length === 0 ? (
            <div className="faint tiny" style={{ marginBottom: 10 }}>
              No classes logged on this day.
            </div>
          ) : (
            selectedClasses.map((dc) => (
              <button
                key={dc.cls.id}
                className="list-cell"
                onClick={() => setEditing(dc)}
              >
                <StatusBadge status={dc.cls.status} />
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{dc.subject.name}</span>
                  <br />
                  <span className="tiny muted">
                    {STATUS_LABELS[dc.cls.status]} · {dc.cls.faculty}
                  </span>
                </span>
                <span className="faint">›</span>
              </button>
            ))
          )}
          {term && (
            <button
              className="btn block primary"
              style={{ marginTop: 12 }}
              onClick={() => setAdding(true)}
            >
              + Add a class on this day
            </button>
          )}
        </Sheet>
      )}

      {adding && selected && term && (
        <AddOnDay
          term={term}
          date={selected}
          onClose={() => setAdding(false)}
        />
      )}

      {editing && term && (
        <ClassForm
          subject={editing.subject}
          initial={editing.cls}
          onSave={(c) => store.updateClass(term.id, editing.subject.id, c)}
          onClose={() => setEditing(null)}
          onDelete={() => store.deleteClass(term.id, editing.subject.id, editing.cls.id)}
        />
      )}
    </>
  );
}

function AddOnDay({
  term,
  date,
  onClose,
}: {
  term: { id: string; subjects: Subject[] };
  date: string;
  onClose: () => void;
}) {
  const store = useStore();
  const [pick, setPick] = useState<Subject | null>(null);

  if (pick) {
    return (
      <ClassForm
        subject={pick}
        defaultDate={date}
        onSave={(c) => store.addClass(term.id, pick.id, c)}
        onClose={onClose}
      />
    );
  }
  return (
    <Sheet title="Pick a subject" onClose={onClose}>
      {term.subjects.map((s) => (
        <button key={s.id} className="list-cell" onClick={() => setPick(s)}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: s.color,
              flex: '0 0 auto',
            }}
          />
          <span className="grow">{s.name}</span>
          <span className="faint">›</span>
        </button>
      ))}
    </Sheet>
  );
}

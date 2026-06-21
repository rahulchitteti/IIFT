import { useState } from 'react';
import { useStore } from '../state/store';
import { bandConfig, computeMetrics, STATUS_LABELS, STATUS_ORDER } from '../engine';
import type { ClassEntry, Status, Subject } from '../types';
import { Sheet, StatusBadge } from '../components/ui';
import { ClassForm } from './ClassForm';
import { dowOf, prettyDate, todayISO, WEEKDAY_SHORT } from '../dates';

interface SlotRow {
  subject: Subject;
  faculty: string;
  time: string;
  existing?: ClassEntry;
}

export function Today() {
  const store = useStore();
  const { data } = store;
  const cfg = bandConfig(data.prefs);
  const term = store.activeTerm ?? data.terms.find((t) => !t.archived);
  const today = todayISO();
  const dow = dowOf(today);
  const isHoliday = data.holidays.includes(today);

  const [moreFor, setMoreFor] = useState<SlotRow | null>(null);
  const [quickMark, setQuickMark] = useState(false);

  const rows: SlotRow[] = [];
  if (term) {
    for (const s of term.subjects) {
      for (const slot of s.schedule) {
        if (slot.day !== dow) continue;
        const existing = s.classes.find(
          (c) => c.date === today && c.faculty === slot.faculty,
        );
        rows.push({ subject: s, faculty: slot.faculty, time: slot.time, existing });
      }
    }
  }
  rows.sort((a, b) => a.time.localeCompare(b.time));

  // subjects needing attention (below safe)
  const needAttention = term
    ? term.subjects.filter((s) => {
        const m = computeMetrics(s, cfg);
        return m.capYet != null && m.capYet < cfg.safePct;
      }).length
    : 0;

  function mark(row: SlotRow, status: Status) {
    store.markToday(term!.id, row.subject.id, status, row.faculty);
  }

  return (
    <>
      <header className="app-header">
        <h1>Today</h1>
        <div className="sub">
          {WEEKDAY_SHORT[dow]} · {prettyDate(today)}
        </div>
      </header>

      <div className="screen">
        {isHoliday && (
          <div className="banner warn">
            <span aria-hidden="true">🎉</span> Today is marked as a holiday — classes are
            excluded from attendance.
          </div>
        )}
        {needAttention > 0 && (
          <div className="banner info">
            <span aria-hidden="true">⚠️</span> {needAttention} subject
            {needAttention === 1 ? '' : 's'} below {cfg.safePct}% — check Subjects.
          </div>
        )}

        {!term ? (
          <div className="empty">
            <div className="big">🗓️</div>
            <p>No active trimester.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <div className="big">☕</div>
            <p>Nothing scheduled for today.</p>
            <p className="tiny muted">
              Add weekly timetable slots in a subject, or mark a class manually.
            </p>
            <button className="btn primary" onClick={() => setQuickMark(true)}>
              Mark a class
            </button>
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              className="card accented"
              key={`${row.subject.id}-${row.faculty}-${i}`}
              style={{ ['--accent' as string]: row.subject.color } as React.CSSProperties}
            >
              <div className="row between">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }} className="ellipsis">
                    {row.subject.name}
                  </div>
                  <div className="tiny muted">
                    {row.time} · {row.faculty}
                    {row.existing ? ` · marked ${STATUS_LABELS[row.existing.status]}` : ''}
                  </div>
                </div>
                {row.existing && <StatusBadge status={row.existing.status} />}
              </div>
              <div className="mark-btns" style={{ marginTop: 10 }}>
                <button
                  className={`mark-btn p${row.existing?.status === 'P' ? ' on' : ''}`}
                  onClick={() => mark(row, 'P')}
                >
                  P
                </button>
                <button
                  className={`mark-btn a${row.existing?.status === 'A' ? ' on' : ''}`}
                  onClick={() => mark(row, 'A')}
                >
                  A
                </button>
                <button className="mark-btn more" aria-label="more statuses" onClick={() => setMoreFor(row)}>
                  ⋯
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {term && (
        <button className="fab" aria-label="Mark a class" onClick={() => setQuickMark(true)}>
          +
        </button>
      )}

      {moreFor && (
        <Sheet title={moreFor.subject.name} onClose={() => setMoreFor(null)}>
          <p className="muted tiny" style={{ marginTop: 0 }}>
            Mark {moreFor.faculty} · {prettyDate(today)}
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className="chip"
                onClick={() => {
                  mark(moreFor, s);
                  setMoreFor(null);
                }}
              >
                {s} · {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {quickMark && term && (
        <QuickMark
          term={term}
          onClose={() => setQuickMark(false)}
        />
      )}
    </>
  );
}

function QuickMark({ term, onClose }: { term: { id: string; subjects: Subject[] }; onClose: () => void }) {
  const store = useStore();
  const [pick, setPick] = useState<Subject | null>(null);

  if (pick) {
    return (
      <ClassForm
        subject={pick}
        defaultDate={todayISO()}
        onSave={(c) => store.addClass(term.id, pick.id, c)}
        onClose={onClose}
      />
    );
  }

  return (
    <Sheet title="Mark a class" onClose={onClose}>
      {term.subjects.length === 0 && <div className="faint">No subjects yet.</div>}
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

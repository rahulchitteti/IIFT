import { useState } from 'react';
import { useStore } from '../state/store';
import type { ClassEntry, Subject, Term } from '../types';
import {
  bandConfig,
  computeMetrics,
  eligibility,
  trend,
  verdict,
  whatIf,
  STATUS_LABELS,
} from '../engine';
import { BandMeter } from '../components/BandMeter';
import {
  BandPill,
  EligibilityPill,
  Stat,
  StatusBadge,
  Stepper,
  pctText,
} from '../components/ui';
import { Sparkline } from '../components/charts';
import { ClassForm } from './ClassForm';
import { SubjectForm } from './SubjectForm';
import { TimetableForm } from './TimetableForm';
import { WEEKDAY_SHORT, prettyDate } from '../dates';

export function SubjectDetail({
  term,
  subject,
  onBack,
}: {
  term: Term;
  subject: Subject;
  onBack: () => void;
}) {
  const store = useStore();
  const cfg = bandConfig(store.data.prefs);
  const m = computeMetrics(subject, cfg);
  const elig = eligibility(m, cfg);
  const [skip, setSkip] = useState(0);
  const wi = whatIf(m, skip, cfg);
  const tr = trend(subject);

  const [editClass, setEditClass] = useState<ClassEntry | null>(null);
  const [addingClass, setAddingClass] = useState(false);
  const [editSubject, setEditSubject] = useState(false);
  const [editTimetable, setEditTimetable] = useState(false);

  const v = verdict(m);
  const vClass =
    m.band.kind === 'debarred'
      ? 'bad'
      : m.band.kind === 'penalty'
        ? 'warn'
        : m.band.kind === 'safe'
          ? 'good'
          : '';

  // group classes by faculty
  const byFaculty = new Map<string, ClassEntry[]>();
  for (const c of subject.classes) {
    const key = c.faculty || '(no faculty)';
    if (!byFaculty.has(key)) byFaculty.set(key, []);
    byFaculty.get(key)!.push(c);
  }

  function saveClass(c: ClassEntry) {
    if (subject.classes.some((x) => x.id === c.id))
      store.updateClass(term.id, subject.id, c);
    else store.addClass(term.id, subject.id, c);
  }

  return (
    <div className="screen">
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 10 }}>
        ← Subjects
      </button>

      <div className="card accented" style={{ ['--accent' as string]: subject.color } as React.CSSProperties}>
        <div className="row between">
          <div className="grow">
            <h2 style={{ margin: '0 0 2px' }}>{subject.name}</h2>
            <div className="muted tiny">
              {subject.credits} credit{subject.credits === 1 ? '' : 's'} · target {m.threshold}%
            </div>
          </div>
          <BandPill band={m.band} />
        </div>
      </div>

      <div className={`verdict ${vClass}`} style={{ marginBottom: 12 }}>
        <span aria-hidden="true">
          {m.band.kind === 'debarred' ? '🚫' : m.band.kind === 'safe' ? '✅' : '⚠️'}
        </span>
        <span>{v}</span>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          Where you stand
        </div>
        <div className="row between">
          <div className="bignum">
            {pctText(m.capYet)} <span className="unit">now</span>
          </div>
          <EligibilityPill elig={elig} />
        </div>
        <BandMeter pct={m.capYet} cfg={cfg} showLegend />
        <div className="stat-grid">
          <Stat label="now" value={pctText(m.capYet)} />
          <Stat label="best" value={pctText(m.best)} />
          <Stat label="if skip all" value={pctText(m.capAll)} />
          <Stat label="can miss" value={m.canMiss} />
        </div>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          What-if planner
        </div>
        <p className="muted tiny" style={{ marginTop: 0 }}>
          Skip the next N of {m.remaining} remaining:
        </p>
        <div className="row between">
          <Stepper value={skip} min={0} max={m.remaining} onChange={setSkip} />
          <div style={{ textAlign: 'right' }}>
            <div className="bignum">{pctText(wi.projectedPct)}</div>
            <div className="tiny muted">projected final</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <BandMeter pct={wi.projectedPct} cfg={cfg} small />
        </div>
        <div className="row between">
          <span className="tiny muted">
            Attend {wi.attend} · skip {wi.skip}
          </span>
          <BandPill band={wi.band} />
        </div>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          Trend
        </div>
        <Sparkline points={tr} safePct={m.threshold} />
        <div className="tiny faint" style={{ marginTop: 4 }}>
          Cumulative attendance after each held class · dashed line = {m.threshold}% target
        </div>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          The numbers
        </div>
        <div className="stat-grid cols-5">
          <Stat label="present" value={m.present} />
          <Stat label="absent" value={m.absent} />
          <Stat label="held" value={m.held} />
          <Stat label="total" value={m.total} />
          <Stat label="excluded" value={m.excluded} />
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <div className="section-title" style={{ marginTop: 0 }}>
            Class log
          </div>
          <button className="btn sm" onClick={() => setAddingClass(true)}>
            + Add
          </button>
        </div>
        {subject.classes.length === 0 && (
          <div className="faint tiny">No classes logged yet.</div>
        )}
        {[...byFaculty.entries()].map(([fac, list]) => (
          <div key={fac} style={{ marginBottom: 8 }}>
            <div className="tiny faint" style={{ margin: '6px 2px' }}>
              {fac} · {list.length}
            </div>
            {list.map((c, i) => (
              <button key={c.id} className="list-cell" onClick={() => setEditClass(c)}>
                <StatusBadge status={c.status} />
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{STATUS_LABELS[c.status]}</span>
                  <br />
                  <span className="tiny muted">
                    {c.date ? prettyDate(c.date) : `Session ${i + 1}`}
                    {c.note ? ` · ${c.note}` : ''}
                  </span>
                </span>
                <span className="faint" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row between">
          <div className="section-title" style={{ marginTop: 0 }}>
            Weekly timetable
          </div>
          <button className="btn sm" onClick={() => setEditTimetable(true)}>
            Edit
          </button>
        </div>
        {subject.schedule.length === 0 ? (
          <div className="faint tiny">No slots — add some so Today can show this subject.</div>
        ) : (
          subject.schedule.map((s, i) => (
            <div key={i} className="row between tiny" style={{ padding: '4px 2px' }}>
              <span>
                <b>{WEEKDAY_SHORT[s.day]}</b> {s.time}
              </span>
              <span className="muted">{s.faculty}</span>
            </div>
          ))
        )}
      </div>

      <button className="btn block" onClick={() => setEditSubject(true)}>
        Edit subject
      </button>

      {addingClass && (
        <ClassForm
          subject={subject}
          onSave={saveClass}
          onClose={() => setAddingClass(false)}
        />
      )}
      {editClass && (
        <ClassForm
          subject={subject}
          initial={editClass}
          onSave={saveClass}
          onClose={() => setEditClass(null)}
          onDelete={() => store.deleteClass(term.id, subject.id, editClass.id)}
        />
      )}
      {editSubject && (
        <SubjectForm
          initial={subject}
          onSave={(s) => store.updateSubject(term.id, s)}
          onClose={() => setEditSubject(false)}
          onDelete={() => {
            store.deleteSubject(term.id, subject.id);
            onBack();
          }}
        />
      )}
      {editTimetable && (
        <TimetableForm
          subject={subject}
          onSave={(sch) => store.setSchedule(term.id, subject.id, sch)}
          onClose={() => setEditTimetable(false)}
        />
      )}
    </div>
  );
}

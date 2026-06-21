import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import {
  bandConfig,
  computeMetrics,
  termSummary,
  urgencyScore,
  verdict,
} from '../engine';
import { BandMeter } from '../components/BandMeter';
import { BandPill, pctText } from '../components/ui';
import { SubjectDetail } from './SubjectDetail';
import { SubjectForm } from './SubjectForm';
import type { Subject } from '../types';

export function Subjects() {
  const store = useStore();
  const { data } = store;
  const cfg = bandConfig(data.prefs);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const activeTerm = store.activeTerm ?? data.terms[0];
  const openSubject = activeTerm?.subjects.find((s) => s.id === openId);

  const sorted = useMemo(() => {
    if (!activeTerm) return [];
    return [...activeTerm.subjects]
      .map((s) => ({ s, m: computeMetrics(s, cfg) }))
      .sort((a, b) => urgencyScore(b.m) - urgencyScore(a.m));
  }, [activeTerm, cfg]);

  if (openSubject && activeTerm) {
    return (
      <SubjectDetail
        term={activeTerm}
        subject={openSubject}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const summary = activeTerm ? termSummary(activeTerm, data.prefs) : null;

  return (
    <>
      <header className="app-header">
        <h1>Subjects</h1>
        {summary && (
          <div className="sub">
            {summary.subjectCount} subjects · overall{' '}
            <b>{pctText(summary.overallPct)}</b>
            {data.prefs.creditWeighted ? ' (credit-weighted)' : ''} ·{' '}
            <span style={{ color: summary.atRisk ? 'var(--risk)' : 'inherit' }}>
              {summary.atRisk} at-risk
            </span>
          </div>
        )}
      </header>

      <div className="screen">
        {/* Trimester switcher */}
        <div className="chips" role="tablist" aria-label="Trimesters">
          {data.terms.map((t) => (
            <button
              key={t.id}
              className="chip"
              aria-pressed={t.id === activeTerm?.id}
              onClick={() => store.setActiveTerm(t.id)}
            >
              {t.name}
              {t.archived ? ' 🗄️' : ''}
            </button>
          ))}
          <button
            className="chip ghost"
            onClick={() => {
              const name = prompt('Name the new trimester', 'New Trimester');
              if (name) store.addTerm(name.trim());
            }}
          >
            + Add
          </button>
        </div>

        {!activeTerm || activeTerm.subjects.length === 0 ? (
          <div className="empty">
            <div className="big">📚</div>
            <p>No subjects in this trimester yet.</p>
            <button className="btn primary" onClick={() => setAdding(true)}>
              Add your first subject
            </button>
          </div>
        ) : (
          sorted.map(({ s }) => (
            <SubjectCard key={s.id} subject={s} onOpen={() => setOpenId(s.id)} />
          ))
        )}
      </div>

      {activeTerm && (
        <button className="fab" aria-label="Add subject" onClick={() => setAdding(true)}>
          +
        </button>
      )}

      {adding && activeTerm && (
        <SubjectForm
          onSave={(s) => store.addSubject(activeTerm.id, s)}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

function SubjectCard({ subject, onOpen }: { subject: Subject; onOpen: () => void }) {
  const store = useStore();
  const cfg = bandConfig(store.data.prefs);
  const m = computeMetrics(subject, cfg);
  const v = verdict(m);

  return (
    <button
      className="card accented"
      onClick={onOpen}
      style={{
        ['--accent' as string]: subject.color,
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: '1px solid var(--border)',
        borderLeft: `5px solid ${subject.color}`,
        color: 'var(--text)',
      } as React.CSSProperties}
    >
      <div className="row between">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontWeight: 750, fontSize: 16 }} className="ellipsis">
              {subject.name}
            </span>
          </div>
          <div className="tiny muted">
            {subject.credits} cr · {m.present}/{m.held} attended · {m.remaining} left
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="bignum" style={{ fontSize: 26 }}>
            {pctText(m.capYet)}
          </div>
        </div>
      </div>

      <BandMeter pct={m.capYet} cfg={cfg} small />

      <div className="row between" style={{ marginTop: 2 }}>
        <span className="tiny" style={{ flex: 1, paddingRight: 8 }}>
          {v}
        </span>
        <BandPill band={m.band} />
      </div>
    </button>
  );
}

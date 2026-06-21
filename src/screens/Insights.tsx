import { useStore } from '../state/store';
import {
  bandConfig,
  computeMetrics,
  sgpaImpact,
  termSummary,
} from '../engine';
import { BarChart, Donut } from '../components/charts';

export function Insights() {
  const store = useStore();
  const { data } = store;
  const cfg = bandConfig(data.prefs);
  const term = store.activeTerm ?? data.terms.find((t) => !t.archived);

  if (!term) {
    return (
      <>
        <header className="app-header">
          <h1>Insights</h1>
        </header>
        <div className="screen">
          <div className="empty">No active trimester.</div>
        </div>
      </>
    );
  }

  const summary = termSummary(term, data.prefs);
  const sgpa = sgpaImpact(term, cfg);

  // aggregate present/absent/excused across term
  let present = 0;
  let absent = 0;
  let excused = 0;
  const bars = term.subjects.map((s) => {
    const m = computeMetrics(s, cfg);
    present += m.present;
    absent += m.absent;
    excused += m.excluded;
    return { label: s.name, pct: m.capYet, color: s.color };
  });

  return (
    <>
      <header className="app-header">
        <h1>Insights</h1>
        <div className="sub">{term.name}</div>
      </header>

      <div className="screen">
        <div className="card">
          <div className="row between">
            <div>
              <div className="bignum" style={{ color: 'var(--risk)' }}>
                {summary.gradePointsAtRisk}
              </div>
              <div className="tiny muted">grade points at risk</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bignum">{summary.atRisk}</div>
              <div className="tiny muted">subjects below {cfg.safePct}%</div>
            </div>
          </div>
          {summary.debarred > 0 && (
            <div className="banner warn" style={{ marginTop: 12, marginBottom: 0 }}>
              <span aria-hidden="true">🚫</span> {summary.debarred} subject
              {summary.debarred === 1 ? '' : 's'} currently in the debarred zone.
            </div>
          )}
        </div>

        {/* SGPA impact */}
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            SGPA impact
          </div>
          {!sgpa.hasData ? (
            <div className="muted tiny">
              Set <b>expected grade point</b> and <b>credits</b> on your subjects (edit a
              subject) to see how attendance could change your SGPA.
            </div>
          ) : (
            <>
              <div className="row between">
                <div>
                  <div className="bignum">{sgpa.expectedSGPA!.toFixed(2)}</div>
                  <div className="tiny muted">expected SGPA</div>
                </div>
                <div aria-hidden="true" style={{ fontSize: 22 }}>
                  →
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="bignum"
                    style={{ color: sgpa.delta > 0 ? 'var(--risk)' : 'var(--safe)' }}
                  >
                    {sgpa.penalizedSGPA!.toFixed(2)}
                  </div>
                  <div className="tiny muted">with attendance penalty</div>
                </div>
              </div>
              <div
                className="verdict warn"
                style={{ marginTop: 12 }}
                hidden={sgpa.delta <= 0.0001}
              >
                <span aria-hidden="true">📉</span>
                <span>
                  Attendance could cost you <b>{sgpa.delta.toFixed(2)}</b> SGPA.
                </span>
              </div>
              {sgpa.delta <= 0.0001 && (
                <div className="verdict good" style={{ marginTop: 12 }}>
                  <span aria-hidden="true">✅</span>
                  <span>No SGPA penalty at your current attendance. Keep it up.</span>
                </div>
              )}
              <hr className="div" />
              {sgpa.rows.map((r) => (
                <div key={r.subjectId} className="row between tiny" style={{ padding: '3px 0' }}>
                  <span className="grow ellipsis">{r.name}</span>
                  <span className="muted">
                    {r.expectedGP}
                    {r.deduct > 0 ? ` → ${r.penalizedGP}` : ''} · {r.credits} cr
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Attendance by subject */}
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            Attendance by subject
          </div>
          {bars.length === 0 ? (
            <div className="faint tiny">No subjects.</div>
          ) : (
            <BarChart rows={bars} safePct={cfg.safePct} />
          )}
          <div className="tiny faint" style={{ marginTop: 6 }}>
            Vertical line marks the {cfg.safePct}% safe threshold.
          </div>
        </div>

        {/* Donut */}
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            Overall breakdown
          </div>
          <Donut present={present} absent={absent} excused={excused} />
        </div>
      </div>
    </>
  );
}

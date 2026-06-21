// Builds a self-contained, print-styled HTML report (offline; no external assets).
import type { AppData } from './types';
import {
  bandConfig,
  computeMetrics,
  eligibility,
  termSummary,
} from './engine';
import { todayISO } from './dates';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
}

function pct(p: number | null): string {
  return p == null ? '—' : `${Math.round(p)}%`;
}

export function buildReportHTML(data: AppData): string {
  const cfg = bandConfig(data.prefs);
  const terms = data.terms.filter((t) => !t.archived);

  const sections = terms
    .map((t) => {
      const summary = termSummary(t, data.prefs);
      const rows = t.subjects
        .map((s) => {
          const m = computeMetrics(s, cfg);
          const e = eligibility(m, cfg);
          return `<tr>
            <td>${esc(s.name)}</td>
            <td class="n">${s.credits}</td>
            <td class="n">${m.present}/${m.held}</td>
            <td class="n">${m.total}</td>
            <td class="n"><b>${pct(m.capYet)}</b></td>
            <td>${esc(m.band.label)}</td>
            <td class="n">${m.mustAttend}</td>
            <td class="n">${m.canMiss}</td>
            <td>${esc(e.label || '—')}</td>
          </tr>`;
        })
        .join('');
      return `<section>
        <h2>${esc(t.name)}</h2>
        <p class="muted">Overall ${pct(summary.overallPct)} · ${summary.atRisk} at-risk · ${summary.gradePointsAtRisk} grade point(s) at risk</p>
        <table>
          <thead><tr>
            <th>Subject</th><th>Cr</th><th>Att/Held</th><th>Total</th>
            <th>%</th><th>Band</th><th>Must attend</th><th>Can miss</th><th>Eligibility</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8">
  <title>Attendance Report — ${todayISO()}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      color: #16181f; margin: 28px; font-variant-numeric: tabular-nums; }
    h1 { font-size: 22px; margin: 0 0 2px; }
    .sub { color: #5b6172; font-size: 13px; margin-bottom: 18px; }
    h2 { font-size: 16px; margin: 22px 0 4px; border-bottom: 2px solid #4338CA; padding-bottom: 4px; }
    .muted { color: #5b6172; font-size: 12.5px; margin: 2px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e6e8f0; }
    th { color: #5b6172; font-weight: 700; }
    td.n, th.n { text-align: right; }
    section { break-inside: avoid; }
    @media print { body { margin: 0; } }
    .rule { font-size: 12px; color: #5b6172; margin-top: 4px; }
  </style></head>
  <body>
    <h1>Attendance &amp; Grade-Risk Report</h1>
    <div class="sub">Generated ${todayISO()} · Rule: safe ${cfg.safePct}%, −1 GP per ${cfg.stepPct}% drop, debar below ${cfg.debarPct}%</div>
    ${sections || '<p>No active trimesters.</p>'}
    <p class="rule">Cap-now % is attendance among classes actually held. Must-attend / can-miss are computed against planned totals.</p>
  </body></html>`;
}

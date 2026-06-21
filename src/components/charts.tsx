// Hand-rolled SVG charts (no chart library).

export function Sparkline({
  points,
  safePct,
  height = 70,
}: {
  points: number[]; // 0..100 values in order
  safePct: number;
  height?: number;
}) {
  const w = 300;
  const h = height;
  const pad = 4;
  if (points.length === 0) {
    return <div className="faint tiny">No held classes yet.</div>;
  }
  const n = points.length;
  const x = (i: number) =>
    n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const safeY = y(safePct);

  const path = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');
  const last = points[n - 1];
  const lastColor =
    last >= safePct ? 'var(--safe)' : last >= safePct - 10 ? 'var(--warn)' : 'var(--danger)';

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Attendance trend, currently ${Math.round(last)} percent`}
      style={{ height }}
    >
      <line
        x1={0}
        x2={w}
        y1={safeY}
        y2={safeY}
        stroke="var(--text-faint)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(last)} r={4} fill={lastColor} />
    </svg>
  );
}

export function BarChart({
  rows,
  safePct,
}: {
  rows: Array<{ label: string; pct: number | null; color: string }>;
  safePct: number;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {rows.map((r) => {
        const pct = r.pct ?? 0;
        const color =
          r.pct == null
            ? 'var(--text-faint)'
            : pct >= safePct
              ? 'var(--safe)'
              : pct >= safePct - 10
                ? 'var(--warn)'
                : pct >= 50
                  ? 'var(--risk)'
                  : 'var(--danger)';
        return (
          <div className="bar-row" key={r.label}>
            <span className="ellipsis" title={r.label}>
              {r.label}
            </span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${Math.max(2, pct)}%`, background: color }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${safePct}%`,
                  top: -2,
                  bottom: -2,
                  width: 2,
                  background: 'var(--text)',
                  opacity: 0.5,
                }}
              />
            </div>
            <span className="num" style={{ textAlign: 'right', fontWeight: 700 }}>
              {r.pct == null ? '—' : `${Math.round(pct)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({
  present,
  absent,
  excused,
}: {
  present: number;
  absent: number;
  excused: number;
}) {
  const total = present + absent + excused;
  const size = 160;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const segments =
    total === 0
      ? []
      : [
          { value: present, color: 'var(--safe)' },
          { value: absent, color: 'var(--danger)' },
          { value: excused, color: 'var(--text-faint)' },
        ];

  let offset = 0;
  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Present ${present}, absent ${absent}, excused ${excused}`}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const frac = total === 0 ? 0 : s.value / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize="26"
          fontWeight="800"
          fill="var(--text)"
        >
          {total === 0 ? '0' : Math.round((present / total) * 100) + '%'}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text-dim)"
        >
          present
        </text>
      </svg>
      <div className="legend">
        <span>
          <span className="dot" style={{ background: 'var(--safe)' }} />
          Present {present}
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--danger)' }} />
          Absent {absent}
        </span>
        <span>
          <span className="dot" style={{ background: 'var(--text-faint)' }} />
          Excused {excused}
        </span>
      </div>
    </div>
  );
}

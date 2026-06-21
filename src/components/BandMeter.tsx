import type { BandConfig } from '../engine';

interface Props {
  pct: number | null;
  cfg: BandConfig;
  small?: boolean;
  showLegend?: boolean;
}

/**
 * Signature element: a thin horizontal bar segmented at the debar % and safe %
 * thresholds (red -> amber -> green) with a marker at the current %.
 */
export function BandMeter({ pct, cfg, small, showLegend }: Props) {
  const clamped = pct == null ? null : Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div
        className={`meter${small ? ' small' : ''}`}
        style={
          {
            ['--debar' as string]: cfg.debarPct,
            ['--safe' as string]: cfg.safePct,
          } as React.CSSProperties
        }
        role="img"
        aria-label={
          pct == null
            ? 'No attendance yet'
            : `Attendance ${Math.round(pct)} percent. Debar below ${cfg.debarPct}, safe at ${cfg.safePct}.`
        }
      >
        <div className="zones" aria-hidden="true">
          <div className="zone-red" />
          <div className="zone-amber" />
          <div className="zone-green" />
        </div>
        {clamped != null && (
          <div
            className="marker"
            style={{ left: `${clamped}%` }}
            data-label={`${Math.round(pct!)}%`}
          />
        )}
      </div>
      {showLegend && (
        <div className="meter-legend" aria-hidden="true">
          <span>0%</span>
          <span>debar {cfg.debarPct}%</span>
          <span>safe {cfg.safePct}%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}

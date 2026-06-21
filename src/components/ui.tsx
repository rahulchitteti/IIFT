import { useEffect, type ReactNode } from 'react';
import type { Band, Eligibility } from '../engine';
import type { Status } from '../types';

export function BandPill({ band }: { band: Band }) {
  return <span className={`pill ${band.kind}`}>{band.label}</span>;
}

export function EligibilityPill({ elig }: { elig: Eligibility }) {
  if (elig.kind === 'none') return null;
  const cls =
    elig.kind === 'eligible' ? 'safe' : elig.kind === 'risk' ? 'penalty' : 'debarred';
  return <span className={`pill ${cls}`}>{elig.label}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`statcell st-${status}`}>{status}</span>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="stepper">
      <button
        aria-label="decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="val">{value}</span>
      <button
        aria-label="increase"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

export function pctText(pct: number | null): string {
  return pct == null ? '—' : `${Math.round(pct)}%`;
}

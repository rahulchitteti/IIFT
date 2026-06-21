import { useState } from 'react';
import type { Subject } from '../types';
import { Sheet } from '../components/ui';
import { uid } from '../id';

const COLORS = [
  '#4338CA',
  '#0e9f6e',
  '#c2710c',
  '#d4451f',
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#be185d',
];

export function SubjectForm({
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  initial?: Subject;
  onSave: (s: Subject) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [credits, setCredits] = useState(String(initial?.credits ?? 0));
  const [total, setTotal] = useState(String(initial?.totalPlanned ?? 0));
  const [threshold, setThreshold] = useState(
    initial?.threshold == null ? '' : String(initial.threshold),
  );
  const [expectedGP, setExpectedGP] = useState(
    initial?.expectedGP == null ? '' : String(initial.expectedGP),
  );
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [faculties, setFaculties] = useState((initial?.faculties ?? []).join(', '));

  function save() {
    const facList = faculties
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const subject: Subject = {
      id: initial?.id ?? uid('subj'),
      name: name.trim() || 'Untitled',
      credits: Math.max(0, Number(credits) || 0),
      totalPlanned: Math.max(0, Math.round(Number(total) || 0)),
      threshold: threshold.trim() === '' ? null : Number(threshold),
      expectedGP: expectedGP.trim() === '' ? null : Number(expectedGP),
      color,
      faculties: facList,
      schedule: initial?.schedule ?? [],
      classes: initial?.classes ?? [],
    };
    onSave(subject);
    onClose();
  }

  return (
    <Sheet title={initial ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Marketing" />
      </label>
      <div className="inline-fields">
        <label className="field">
          <span>Credits</span>
          <input inputMode="decimal" value={credits} onChange={(e) => setCredits(e.target.value)} />
        </label>
        <label className="field">
          <span>Total planned classes</span>
          <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
      </div>
      <div className="inline-fields">
        <label className="field">
          <span>Required % (blank = global)</span>
          <input inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="80" />
        </label>
        <label className="field">
          <span>Expected grade point</span>
          <input inputMode="decimal" value={expectedGP} onChange={(e) => setExpectedGP(e.target.value)} placeholder="e.g. 9" />
        </label>
      </div>
      <label className="field">
        <span>Faculty (comma-separated)</span>
        <input value={faculties} onChange={(e) => setFaculties(e.target.value)} placeholder="Prof. A, Prof. B" />
      </label>
      <label className="field">
        <span>Accent color</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid var(--text)' : '2px solid var(--border)',
              }}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48 }} />
        </div>
      </label>

      <div className="sheet-actions">
        {onDelete && (
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Delete this subject and all its classes?')) {
                onDelete();
                onClose();
              }
            }}
          >
            Delete
          </button>
        )}
        <button className="btn ghost grow" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary grow" onClick={save}>
          Save
        </button>
      </div>
    </Sheet>
  );
}

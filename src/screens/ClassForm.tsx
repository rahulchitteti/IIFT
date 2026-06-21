import { useState } from 'react';
import type { ClassEntry, Subject } from '../types';
import { Sheet } from '../components/ui';
import { STATUS_LABELS, STATUS_ORDER } from '../engine';
import { uid } from '../id';
import { todayISO } from '../dates';

export function ClassForm({
  subject,
  initial,
  defaultDate,
  onSave,
  onClose,
  onDelete,
}: {
  subject: Subject;
  initial?: ClassEntry;
  defaultDate?: string;
  onSave: (c: ClassEntry) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [status, setStatus] = useState(initial?.status ?? 'P');
  const [faculty, setFaculty] = useState(
    initial?.faculty ?? subject.faculties[0] ?? '',
  );
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? '');

  function save() {
    onSave({
      id: initial?.id ?? uid('cls'),
      status,
      faculty,
      date: date || null,
      note: note.trim(),
    });
    onClose();
  }

  return (
    <Sheet title={initial ? 'Edit class' : 'Add class'} onClose={onClose}>
      <label className="field">
        <span>Status</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={`chip${status === s ? ' active' : ''}`}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s} · {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </label>
      <label className="field">
        <span>Faculty</span>
        {subject.faculties.length > 0 ? (
          <select value={faculty} onChange={(e) => setFaculty(e.target.value)}>
            {!subject.faculties.includes(faculty) && <option value={faculty}>{faculty || '—'}</option>}
            {subject.faculties.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        ) : (
          <input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Faculty name" />
        )}
      </label>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Note</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </label>

      <div className="sheet-actions">
        {onDelete && (
          <button
            className="btn danger"
            onClick={() => {
              onDelete();
              onClose();
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

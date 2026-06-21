import { useState } from 'react';
import type { ScheduleSlot, Subject } from '../types';
import { Sheet } from '../components/ui';
import { WEEKDAY_SHORT } from '../dates';

export function TimetableForm({
  subject,
  onSave,
  onClose,
}: {
  subject: Subject;
  onSave: (schedule: ScheduleSlot[]) => void;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(
    subject.schedule.map((s) => ({ ...s })),
  );

  function update(i: number, patch: Partial<ScheduleSlot>) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    setSlots((prev) => [
      ...prev,
      { day: 1, time: '09:30', faculty: subject.faculties[0] ?? '' },
    ]);
  }
  function remove(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <Sheet title="Weekly timetable" onClose={onClose}>
      <p className="muted tiny" style={{ marginTop: 0 }}>
        Slots feed the Today screen and the “generate classes from timetable” tool.
      </p>
      {slots.length === 0 && <div className="faint tiny">No slots yet.</div>}
      {slots.map((s, i) => (
        <div className="card" key={i} style={{ padding: 10 }}>
          <div className="inline-fields">
            <label className="field" style={{ marginBottom: 8 }}>
              <span>Weekday</span>
              <select value={s.day} onChange={(e) => update(i, { day: Number(e.target.value) })}>
                {WEEKDAY_SHORT.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginBottom: 8 }}>
              <span>Time</span>
              <input type="time" value={s.time} onChange={(e) => update(i, { time: e.target.value })} />
            </label>
          </div>
          <label className="field" style={{ marginBottom: 8 }}>
            <span>Faculty</span>
            {subject.faculties.length > 0 ? (
              <select value={s.faculty} onChange={(e) => update(i, { faculty: e.target.value })}>
                {!subject.faculties.includes(s.faculty) && <option value={s.faculty}>{s.faculty || '—'}</option>}
                {subject.faculties.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <input value={s.faculty} onChange={(e) => update(i, { faculty: e.target.value })} />
            )}
          </label>
          <button className="btn sm danger" onClick={() => remove(i)}>
            Remove slot
          </button>
        </div>
      ))}
      <button className="btn block" onClick={add}>
        + Add slot
      </button>
      <div className="sheet-actions">
        <button className="btn ghost grow" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary grow"
          onClick={() => {
            onSave(slots);
            onClose();
          }}
        >
          Save timetable
        </button>
      </div>
    </Sheet>
  );
}

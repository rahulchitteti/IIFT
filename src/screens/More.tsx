import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import * as storage from '../storage';
import { Sheet } from '../components/ui';
import { addDays, todayISO } from '../dates';
import type { Prefs } from '../types';
import { buildReportHTML } from '../report';

export function More() {
  const store = useStore();
  const { data } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [genFor, setGenFor] = useState<string | null>(null);
  const [notifState, setNotifState] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );

  function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    store.setPrefs({ [key]: value } as Partial<Prefs>);
  }

  function download(filename: string, text: string, type: string) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    download(
      `attendance-backup-${todayISO()}.json`,
      storage.exportJSON(data),
      'application/json',
    );
  }

  function exportCSV() {
    const rows: string[] = ['term,subject,faculty,date,status,note'];
    const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
    for (const t of data.terms) {
      for (const s of t.subjects) {
        for (const c of s.classes) {
          rows.push(
            [
              esc(t.name),
              esc(s.name),
              esc(c.faculty),
              esc(c.date ?? ''),
              c.status,
              esc(c.note),
            ].join(','),
          );
        }
      }
    }
    download(`attendance-${todayISO()}.csv`, rows.join('\n'), 'text/csv');
  }

  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = storage.importJSON(String(reader.result));
        store.replaceAll(next, 'Imported backup');
      } catch {
        alert('Could not read that file. Make sure it is a JSON backup from this app.');
      }
    };
    reader.readAsText(file);
  }

  function printReport() {
    const html = buildReportHTML(data);
    const w = window.open('', '_blank');
    if (!w) {
      alert('Allow pop-ups to open the printable report.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // give it a tick to lay out before printing
    setTimeout(() => {
      w.focus();
      w.print();
    }, 250);
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') {
      alert('This browser does not support notifications.');
      return;
    }
    const res = await Notification.requestPermission();
    setNotifState(res);
    setPref('reminders', { ...data.prefs.reminders, enabled: res === 'granted' });
    if (res === 'granted') {
      new Notification('Reminders on', {
        body: 'You will see in-app nudges. Timed background alerts are limited on mobile browsers.',
      });
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>More</h1>
      </header>

      <div className="screen">
        {/* Appearance */}
        <div className="section-title">Appearance</div>
        <div className="card">
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Theme</span>
            <select
              value={data.prefs.theme}
              onChange={(e) => setPref('theme', e.target.value as Prefs['theme'])}
            >
              <option value="auto">Auto (system)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>

        {/* Rule */}
        <div className="section-title">Attendance rule</div>
        <div className="card">
          <p className="muted tiny" style={{ marginTop: 0 }}>
            These flow through the whole app: bands, verdicts, eligibility and SGPA.
          </p>
          <div className="inline-fields">
            <label className="field">
              <span>Safe %</span>
              <input
                inputMode="numeric"
                value={data.prefs.safePct}
                onChange={(e) => setPref('safePct', clampPct(e.target.value, 80))}
              />
            </label>
            <label className="field">
              <span>−1 GP per drop of %</span>
              <input
                inputMode="numeric"
                value={data.prefs.stepPct}
                onChange={(e) =>
                  setPref('stepPct', Math.max(1, Math.round(Number(e.target.value) || 10)))
                }
              />
            </label>
          </div>
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Debar below %</span>
            <input
              inputMode="numeric"
              value={data.prefs.debarPct}
              onChange={(e) => setPref('debarPct', clampPct(e.target.value, 50))}
            />
          </label>
        </div>

        {/* Overall */}
        <div className="section-title">Overall %</div>
        <div className="card">
          <div className="switch" style={{ padding: 0 }}>
            <span>
              Credit-weighted overall %
              <br />
              <span className="tiny muted">Weight each subject by its credits.</span>
            </span>
            <input
              type="checkbox"
              checked={data.prefs.creditWeighted}
              onChange={(e) => setPref('creditWeighted', e.target.checked)}
              aria-label="credit weighted"
            />
          </div>
        </div>

        {/* Reminders */}
        <div className="section-title">Reminders</div>
        <div className="card">
          <div className="banner info" style={{ marginTop: 0 }}>
            <span aria-hidden="true">ℹ️</span>
            <span className="tiny">
              In-app nudges (Today banner + Insights) are reliable. Timed background
              notifications are <b>not guaranteed</b> — mobile browsers restrict background
              execution for PWAs. For reliable scheduled alerts, package to an APK later
              (e.g. PWABuilder).
            </span>
          </div>
          <button className="btn block" onClick={enableNotifications}>
            {notifState === 'granted'
              ? 'Notifications enabled ✓'
              : 'Enable notifications'}
          </button>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Daily “mark today” time</span>
            <input
              type="time"
              value={data.prefs.reminders.dailyNudge}
              onChange={(e) =>
                setPref('reminders', {
                  ...data.prefs.reminders,
                  dailyNudge: e.target.value,
                })
              }
            />
          </label>
          <div className="switch">
            <span>Danger alerts (subject dropped below safe)</span>
            <input
              type="checkbox"
              checked={data.prefs.reminders.danger}
              onChange={(e) =>
                setPref('reminders', { ...data.prefs.reminders, danger: e.target.checked })
              }
              aria-label="danger alerts"
            />
          </div>
          <div className="switch">
            <span>Weekly summary</span>
            <input
              type="checkbox"
              checked={data.prefs.reminders.weekly}
              onChange={(e) =>
                setPref('reminders', { ...data.prefs.reminders, weekly: e.target.checked })
              }
              aria-label="weekly summary"
            />
          </div>
        </div>

        {/* Trimesters */}
        <div className="section-title">Trimesters</div>
        {data.terms.map((t) => (
          <div className="card" key={t.id}>
            <div className="row between">
              <b>
                {t.name}
                {t.archived ? ' 🗄️' : ''}
              </b>
              <span className="tiny muted">{t.subjects.length} subjects</span>
            </div>
            <div className="btn-grid" style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={() => store.toggleArchiveTerm(t.id)}>
                {t.archived ? 'Unarchive' : 'Archive'}
              </button>
              <button className="btn sm" onClick={() => store.cloneTerm(t.id)}>
                Clone
              </button>
              <button className="btn sm" onClick={() => setGenFor(t.id)}>
                Generate classes
              </button>
              <button
                className="btn sm danger"
                onClick={() => {
                  if (confirm(`Delete “${t.name}” and all its data?`))
                    store.deleteTerm(t.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Data */}
        <div className="section-title">Data</div>
        <div className="card">
          <div className="btn-grid">
            <button className="btn" onClick={printReport}>
              🖨️ Print report
            </button>
            <button className="btn" onClick={exportJSON}>
              ⬇️ Backup (JSON)
            </button>
            <button className="btn" onClick={exportCSV}>
              ⬇️ Export CSV
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              ⬆️ Import JSON
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn danger block"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (confirm('Reset everything to the seed data? Your changes will be lost.'))
                store.resetToSeed();
            }}
          >
            Reset to seed
          </button>
        </div>

        <p className="tiny faint" style={{ textAlign: 'center', marginTop: 20 }}>
          Offline-first · data stored on this device only · no account, no network.
        </p>
      </div>

      {genFor && (
        <GenerateSheet termId={genFor} onClose={() => setGenFor(null)} />
      )}
    </>
  );
}

function GenerateSheet({ termId, onClose }: { termId: string; onClose: () => void }) {
  const store = useStore();
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(addDays(todayISO(), 30));

  return (
    <Sheet title="Generate classes from timetable" onClose={onClose}>
      <p className="muted tiny" style={{ marginTop: 0 }}>
        Creates <b>Present</b> entries for every timetable slot in the range, skipping
        holidays and slots already logged. Edit any afterwards.
      </p>
      <div className="inline-fields">
        <label className="field">
          <span>From</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <div className="sheet-actions">
        <button className="btn ghost grow" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary grow"
          onClick={() => {
            const n = store.generateFromTimetable(termId, start, end);
            onClose();
            alert(`Created ${n} class${n === 1 ? '' : 'es'}.`);
          }}
        >
          Generate
        </button>
      </div>
    </Sheet>
  );
}

function clampPct(v: string, fallback: number): number {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

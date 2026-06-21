import { useStore } from './state/store';
import { Today } from './screens/Today';
import { Subjects } from './screens/Subjects';
import { Insights } from './screens/Insights';
import { CalendarScreen } from './screens/Calendar';
import { More } from './screens/More';

const TABS = [
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'subjects', label: 'Subjects', icon: '📚' },
  { id: 'insights', label: 'Insights', icon: '📊' },
  { id: 'calendar', label: 'Calendar', icon: '🗓️' },
  { id: 'more', label: 'More', icon: '⋯' },
];

export function App() {
  const { data, setActiveTab, toast, dismissToast } = useStore();
  const tab = data.activeTab;

  return (
    <div className="app">
      {tab === 'today' && <Today />}
      {tab === 'subjects' && <Subjects />}
      {tab === 'insights' && <Insights />}
      {tab === 'calendar' && <CalendarScreen />}
      {tab === 'more' && <More />}

      <nav className="tabbar" aria-label="Primary">
        {TABS.map((t) => (
          <button
            key={t.id}
            aria-current={tab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="ico" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          <span className="grow">{toast.message}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
              }}
            >
              Undo
            </button>
          )}
          <button aria-label="dismiss" onClick={dismissToast} style={{ color: '#9aa3b8' }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

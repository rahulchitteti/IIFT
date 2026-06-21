// Local date math only. We deliberately avoid toISOString() because it is UTC
// and would shift the calendar day in IST (and other +TZ zones).

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format a Date as YYYY-MM-DD using LOCAL components. */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  return localISO(new Date());
}

/** Parse a YYYY-MM-DD string into a LOCAL Date (midnight local). */
export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Day of week 0=Sun..6=Sat for a YYYY-MM-DD string, local. */
export function dowOf(s: string): number {
  return parseISO(s).getDay();
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return localISO(d);
}

/** Inclusive range of YYYY-MM-DD strings from start to end. */
export function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let cur = startISO;
  // guard against reversed ranges
  if (parseISO(endISO) < parseISO(startISO)) return out;
  let guard = 0;
  while (parseISO(cur) <= parseISO(endISO) && guard < 4000) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Human label like "Sun, 21 Jun 2026". */
export function prettyDate(s: string): string {
  const d = parseISO(s);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_LONG[
    d.getMonth()
  ].slice(0, 3)} ${d.getFullYear()}`;
}

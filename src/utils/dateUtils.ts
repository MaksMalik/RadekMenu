const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const MONTH_NAMES_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

const DAY_NAMES = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const DAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
// Week starts Monday — header order
export const WEEKDAY_HEADERS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

/** Local today as ISO YYYY-MM-DD */
export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

/** "Wtorek, 10 czerwca 2026" */
export function formatLong(iso: string): string {
  const d = fromISO(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Wtorek" */
export function dayName(iso: string): string {
  return DAY_NAMES[fromISO(iso).getDay()];
}

export function dayShort(iso: string): string {
  return DAY_SHORT[fromISO(iso).getDay()];
}

/** "Czerwiec 2026" */
export function monthLabel(iso: string): string {
  const d = fromISO(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayOfMonth(iso: string): number {
  return fromISO(iso).getDate();
}

export function isSameMonth(isoA: string, isoB: string): boolean {
  const a = fromISO(isoA);
  const b = fromISO(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Returns a 6-row x 7-col matrix of ISO dates for the month containing `iso`,
 * weeks starting on Monday. Includes leading/trailing days from adjacent months.
 */
export function getMonthMatrix(iso: string): string[][] {
  const d = fromISO(iso);
  const year = d.getFullYear();
  const month = d.getMonth();

  const first = new Date(year, month, 1);
  // JS: 0=Sun..6=Sat. We want Monday-first, so offset.
  const jsDay = first.getDay(); // 0..6
  const mondayOffset = (jsDay + 6) % 7; // days since Monday

  const start = new Date(year, month, 1 - mondayOffset);

  const weeks: string[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** The Monday–Sunday week (7 ISO dates) containing `iso`. */
export function getWeekDates(iso: string): string[] {
  const d = fromISO(iso);
  const jsDay = d.getDay();
  const mondayOffset = (jsDay + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayOffset);
  const week: string[] = [];
  const cursor = new Date(monday);
  for (let i = 0; i < 7; i++) {
    week.push(toISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return week;
}

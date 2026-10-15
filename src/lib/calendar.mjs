/** @param {number} year @param {number} month 1-12 @param {number} delta */
export function shiftMonth(year, month, delta) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** @param {number} year @param {number} month */
export function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** @param {string} key YYYY-MM */
export function parseMonth(key) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Sunday-first month grid. Nulls are the blank cells before and after the month.
 * @param {number} year
 * @param {number} month
 * @returns {(number | null)[]}
 */
export function buildMonthGrid(year, month) {
  const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  /** @type {(number | null)[]} */
  const cells = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** @param {string} title */
export function shortEventName(title) {
  const quoted = title.match(/「([^」]+)」/);
  if (quoted?.[1]) return quoted[1];
  const compact = title.replace(/\s+/g, '');
  return compact.length > 6 ? compact.slice(0, 6) : compact;
}

/**
 * @param {{ date: string }[]} events
 * @param {string} today YYYY-MM-DD
 */
export function defaultMonth(events, today) {
  const upcoming = events
    .map((event) => event.date)
    .filter((date) => date >= today)
    .sort();
  return (upcoming[0] || today).slice(0, 7);
}

/**
 * @param {{ date: string }[]} events
 * @param {string} today
 */
export function monthsToBuild(events, today) {
  const keys = new Set();
  const [year, month] = today.split('-').map(Number);
  for (let delta = -6; delta <= 14; delta += 1) {
    const shifted = shiftMonth(year, month, delta);
    keys.add(monthKey(shifted.year, shifted.month));
  }
  for (const event of events) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(event.date)) keys.add(event.date.slice(0, 7));
  }
  return [...keys].sort();
}

/** @param {string} key */
export function monthHref(key) {
  return `/events/${key}`;
}

/**
 * @param {{ date: string, startTime?: string }[]} events
 * @param {string} key YYYY-MM
 */
export function eventsInMonth(events, key) {
  return events
    .filter((event) => event.date.startsWith(`${key}-`))
    .sort(
      (a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''),
    );
}

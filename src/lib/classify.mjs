/**
 * 活動是否已結束，以台北時間的「日期」比較，不含時分。
 * 活動當天仍算即將舉行，隔天起算過往。
 *
 * @param {string} date YYYY-MM-DD
 * @param {string} today YYYY-MM-DD
 */
export function isPastEvent(date, today) {
  return date < today;
}

/** @param {Date} [now] */
export function taipeiToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * @param {{ date: string, startTime?: string }[]} events
 * @param {string} today
 */
export function splitEvents(events, today) {
  const bySchedule = (a, b) =>
    a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || '');
  const upcoming = events.filter((event) => event.date >= today).sort(bySchedule);
  const past = events.filter((event) => event.date < today).sort((a, b) => bySchedule(b, a));
  return { upcoming, past };
}

/** @param {string} iso */
export function formatEventDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
  }).format(new Date(`${iso}T12:00:00+08:00`));
  const short = weekday.replace('週', '').replace('星期', '');
  return `${year}年${month}月${day}日（${short}）`;
}

/** @param {string} start @param {string} end */
export function formatTimeRange(start, end) {
  if (start && end) return `${start}–${end}`;
  return start || end || '';
}

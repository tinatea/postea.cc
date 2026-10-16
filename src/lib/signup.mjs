import { formatEventDate, formatTimeRange } from './classify.mjs';

export const LINE_NOTE = '開啟 LINE 不代表報名完成，以工作室確認為準';

const KNOWN_STATUS = new Set(['即將開放', '報名中', '已額滿', '已取消']);

/** @param {string} value */
function clockOf(value) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || '').trim());
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] ? Number(match[3]) : 0;
  if (hour > 23 || minute > 59 || second > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

/** @param {Date} now */
export function taipeiStamp(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const hour = String(parts.hour).padStart(2, '0');
  return `${parts.year}-${parts.month}-${parts.day}T${hour === '24' ? '00' : hour}:${parts.minute}:${parts.second}`;
}

/**
 * 讀台北時間。空白或讀不懂回空字串，不讓建置失敗。
 * 只寫日期時，start 是當天 00:00，end 是當天 23:59:59。
 * @param {unknown} value
 * @param {'start' | 'end'} boundary
 */
export function parseTaipeiStamp(value, boundary = 'start') {
  let text = String(value ?? '').trim().replace('T', ' ').replace(/\//g, '-');
  text = text.replace(/\s*(?:\+08(?::?00)?|GMT\+8)$/i, '').trim();
  if (!text) return '';
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/.exec(text);
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return '';
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!match[4]) return boundary === 'end' ? `${date}T23:59:59` : `${date}T00:00:00`;
  const clock = clockOf(match[4]);
  if (!clock) return '';
  return `${date}T${clock}`;
}

/** @param {unknown} value */
export function formatTaipeiInput(value) {
  const text = String(value ?? '').trim();
  const stamp = parseTaipeiStamp(text, 'start');
  if (!stamp) return '';
  const [date, time] = stamp.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const dateLabel = `${year}年${month}月${day}日`;
  if (!/\d{1,2}:\d{2}/.test(text)) return dateLabel;
  return `${dateLabel} ${time.slice(0, 5)}`;
}

/** @param {{ date?: string, startTime?: string }} event */
function startStamp(event) {
  return `${event.date}T${clockOf(event.startTime) || '00:00:00'}`;
}

/** 有寫結束時間、且晚於開始，才算明確的結束。 */
function explicitEndStamp(event) {
  const end = clockOf(event.endTime);
  const start = clockOf(event.startTime);
  if (!end) return '';
  if (start && end <= start) return '';
  return `${event.date}T${end}`;
}

/** 沒寫結束時間，活動日結束（23:59:59）才算已結束。 */
function endedStamp(event) {
  return explicitEndStamp(event) || `${event.date}T23:59:59`;
}

function closeStamp(event, endAt) {
  const parsed = parseTaipeiStamp(event.signupClose, 'end');
  if (!parsed) return startStamp(event);
  return parsed > endAt ? endAt : parsed;
}

/**
 * 草稿不進任何公開頁。空白或不認識的發布狀態當成公開。
 * @param {{ publishStatus?: string }[]} events
 */
export function publishedOnly(events) {
  return events.filter((event) => String(event?.publishStatus ?? '').trim() !== '草稿');
}

/**
 * 公開場次的顯示狀態。順序：已取消 → 已結束 → 報名截止 → 即將開放 → 已額滿 → 報名中。
 * @param {Record<string, string | undefined>} event
 * @param {Date} [now]
 */
export function resolveSignup(event, now = new Date()) {
  const raw = String(event.signupStatus || '').trim();
  const known = KNOWN_STATUS.has(raw) ? raw : '';
  const lineMode = String(event.signupMethod || '').trim().toUpperCase() === 'LINE';
  const url = String(event.registrationUrl || '').trim();
  const formReady = /^https?:\/\//i.test(url);
  const nowAt = taipeiStamp(now);
  const endAt = endedStamp(event);
  const closeAt = closeStamp(event, endAt);
  const openAt = parseTaipeiStamp(event.signupOpen, 'start');
  const beforeOpen = !openAt || nowAt < openAt;

  let status = '即將開放';
  if (known === '已取消') status = '已取消';
  else if (nowAt >= endAt) status = '已結束';
  else if (nowAt >= closeAt) status = '報名截止';
  else if (beforeOpen || known === '即將開放' || known === '') status = '即將開放';
  else if (known === '已額滿') status = '已額滿';
  else if (known === '報名中' && (lineMode || formReady)) status = '報名中';

  let action = 'line-ask';
  if (status === '報名中' && lineMode) action = 'line-register';
  else if (status === '報名中') action = 'form';
  else if (status === '已額滿') action = 'others';
  else if (status === '已結束') action = 'recent';

  const openText = formatTaipeiInput(event.signupOpen);
  const openLabel =
    status === '即將開放' ? (openAt && openAt > nowAt && openText ? `報名開放時間：${openText}` : '開放時間待公布') : '';

  return { status, action, openLabel, lineMode, formReady, url };
}

/** 首頁與課程頁要推的下一場：還沒結束、也沒取消。 */
export function isPromoted(event, now = new Date()) {
  const { status } = resolveSignup(event, now);
  return status !== '已取消' && status !== '已結束';
}

/** @param {{ title?: string, date: string, startTime?: string, endTime?: string, venue?: string, price?: string }} event */
export function eventSummary(event) {
  const when = formatEventDate(event.date);
  const time = formatTimeRange(event.startTime || '', event.endTime || '');
  const schedule = [when, time].filter(Boolean).join(' ');
  return [event.title, schedule, event.venue, event.price].filter(Boolean).join('，');
}

/**
 * 跟頁面上看得到的內容一致。不放門牌、不放剩餘名額。
 * @param {Record<string, string | undefined>} event
 * @param {{ siteUrl?: string, name?: string }} site
 * @param {Date} [now]
 */
export function eventJsonLd(event, site, now = new Date()) {
  const signup = resolveSignup(event, now);
  const siteUrl = String(site.siteUrl || 'https://postea.cc').replace(/\/$/, '');
  /** @type {Record<string, unknown>} */
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: eventSummary(event),
    url: `${siteUrl}/events/${event.id}/`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus:
      signup.status === '已取消' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    inLanguage: 'zh-Hant',
    organizer: {
      '@type': 'Organization',
      name: site.name || 'Postèa 香語所',
      url: siteUrl,
    },
  };
  const startClock = clockOf(event.startTime);
  data.startDate = startClock ? `${event.date}T${startClock}+08:00` : event.date;
  const end = explicitEndStamp(event);
  if (end) data.endDate = `${end}+08:00`;
  if (event.venue) {
    /** @type {Record<string, unknown>} */
    const location = { '@type': 'Place', name: event.venue };
    if (String(event.venue).includes('台北')) {
      location.address = {
        '@type': 'PostalAddress',
        addressLocality: '台北市',
        addressCountry: 'TW',
      };
    }
    data.location = location;
  }
  if (signup.action === 'form') {
    /** @type {Record<string, unknown>} */
    const offers = {
      '@type': 'Offer',
      url: signup.url,
      availability: 'https://schema.org/InStock',
    };
    const price = String(event.price || '').match(/([0-9][0-9,]*)/);
    if (price) {
      offers.price = price[1].replace(/,/g, '');
      offers.priceCurrency = 'TWD';
    }
    data.offers = offers;
  }
  return data;
}

/**
 * 開始時間可以是 14:30，也可以是 Tina 貼上的一整句。
 * 句子裡的「開放入場／開始／結束」會拆成開門、開始、結束。
 * 換行，或「結束後…」，是活動頁時間下面的小字。
 */

/** @param {unknown} value */
function normalizeClock(value) {
  const match = /(\d{1,2}):(\d{2})/.exec(String(value ?? ''));
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** @param {unknown} value */
function isClock(value) {
  return /^\d{1,2}:\d{2}$/.test(String(value ?? '').trim());
}

/**
 * @param {string} text
 */
function parseFree(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let head = lines[0] || '';
  let timeNote = lines.slice(1).join('\n');
  if (!timeNote) {
    const splitAt = head.search(/結束後/);
    if (splitAt > 0) {
      timeNote = head.slice(splitAt).replace(/^[。．.\s]+/, '');
      head = head.slice(0, splitAt).replace(/[。．.\s｜|]+$/, '');
    }
  }

  const range = head.match(/^(\d{1,2}:\d{2})\s*[–—\-~～]+\s*(\d{1,2}:\d{2})$/);
  if (range) {
    return {
      doorTime: '',
      startTime: normalizeClock(range[1]),
      endTime: normalizeClock(range[2]),
      schedule: '',
      timeNote,
    };
  }

  const parts = head.split(/[｜|]/).map((part) => part.trim()).filter(Boolean);
  let doorTime = '';
  let startTime = '';
  let endTime = '';
  let labeled = false;
  for (const part of parts) {
    const clock = normalizeClock(part);
    if (!clock) continue;
    if (/結束/.test(part)) {
      endTime = clock;
      labeled = true;
    } else if (/開放入場|入場|開門/.test(part)) {
      doorTime = clock;
      labeled = true;
    } else if (/開始/.test(part)) {
      startTime = clock;
      labeled = true;
    }
  }

  if (!labeled) {
    const clocks = [...head.matchAll(/(\d{1,2}):(\d{2})/g)].map((match) => normalizeClock(match[0])).filter(Boolean);
    const bare = clocks.length > 0 && head.replace(/\d{1,2}:\d{2}/g, '').replace(/[–—\-~～\s]/g, '') === '';
    return {
      doorTime: '',
      startTime: clocks[0] || '',
      endTime: clocks.length >= 2 ? clocks[clocks.length - 1] : '',
      schedule: bare ? '' : head,
      timeNote,
    };
  }

  return {
    doorTime,
    startTime: startTime || doorTime,
    endTime,
    schedule: head,
    timeNote,
  };
}

/** @param {Record<string, unknown>} raw */
export function parseEventTimes(raw) {
  const scheduleField = String(raw.schedule ?? '').trim();
  const startRaw = String(raw.startTime ?? '').trim();
  const endRaw = String(raw.endTime ?? '').trim();
  const doorRaw = String(raw.doorTime ?? '').trim();
  const noteRaw = String(raw.timeNote ?? '').trim();
  const free = scheduleField || (startRaw && !isClock(startRaw) ? startRaw : '');

  if (!free) {
    return {
      doorTime: normalizeClock(doorRaw),
      startTime: isClock(startRaw) ? normalizeClock(startRaw) : startRaw,
      endTime: isClock(endRaw) ? normalizeClock(endRaw) : endRaw,
      schedule: '',
      timeNote: noteRaw,
    };
  }

  const parsed = parseFree(free);
  return {
    doorTime: parsed.doorTime || normalizeClock(doorRaw),
    startTime: parsed.startTime || (isClock(startRaw) ? normalizeClock(startRaw) : ''),
    endTime: parsed.endTime || (isClock(endRaw) ? normalizeClock(endRaw) : ''),
    schedule: parsed.schedule,
    timeNote: noteRaw || parsed.timeNote,
  };
}

/** 月曆、列表、課程卡用的短時間。用活動開始，不用開門時間。 */
export function compactTime(event) {
  const start = String(event?.startTime || '');
  const end = String(event?.endTime || '');
  if (start && end) return `${start}–${end}`;
  return start || end;
}

/** 活動頁時間那一列。有貼上的句子就照登。 */
export function detailTime(event) {
  const schedule = String(event?.schedule || '').trim();
  return schedule || compactTime(event);
}

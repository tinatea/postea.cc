/**
 * 內建主題圖。試算表「封面圖」有填網址時，以那一格為準。
 * 換「晚寄的桂花」的郵票時，只改 ART_BASE，並把 cover、stamp-simple、share 放到 public 的同一路徑。
 * 活動網址仍是 /events/osmanthus-tea-room-2026-11/，不要改代號。
 */
const ART_BASE = '/themes/theme-2026-11-osmanthus-tea-room';

export const THEME_ART = {
  'osmanthus-tea-room-2026-11': {
    alt: '晚寄的桂花 No. 01 主題郵票',
    cover: {
      width: 1600,
      height: 1000,
      src: `${ART_BASE}-cover-800.png`,
      webp: [
        [`${ART_BASE}-cover-480.webp`, 480],
        [`${ART_BASE}-cover-800.webp`, 800],
        [`${ART_BASE}-cover-1200.webp`, 1200],
        [`${ART_BASE}-cover-1600.webp`, 1600],
      ],
      png: [
        [`${ART_BASE}-cover-800.png`, 800],
        [`${ART_BASE}-cover-1600.png`, 1600],
      ],
    },
    /** 畫面寬度低於 160px 才用這張，小字已經拿掉。 */
    simple: {
      width: 160,
      height: 213,
      src: `${ART_BASE}-stamp-simple-320.png`,
      webp: [
        [`${ART_BASE}-stamp-simple-160.webp`, 160],
        [`${ART_BASE}-stamp-simple-320.webp`, 320],
      ],
      png: [
        [`${ART_BASE}-stamp-simple-160.png`, 160],
        [`${ART_BASE}-stamp-simple-320.png`, 320],
      ],
    },
    share: `${ART_BASE}-share.png`,
    shareWidth: 1200,
    shareHeight: 630,
  },
};

/** @param {{ id?: string, title?: string, coverImage?: string } | null | undefined} event */
export function themeArt(event) {
  const builtin = THEME_ART[event?.id || ''] || null;
  const custom = String(event?.coverImage || '').trim();
  if (/^(https?:\/\/|\/)/i.test(custom)) {
    return {
      alt: builtin?.alt || String(event?.title || '活動封面'),
      custom,
      share: custom,
    };
  }
  return builtin;
}

/** @param {[string, number][]} sources */
export function imageSrcset(sources) {
  return sources.map(([src, width]) => `${src} ${width}w`).join(', ');
}

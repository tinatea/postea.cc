/** 內建主題圖。試算表「封面圖」有填網址時，以那一格為準。 */

const OSMANTHUS = '/themes/theme-2026-11-osmanthus-tea-room';

export const THEME_ART = {
  'osmanthus-tea-room-2026-11': {
    alt: '桂花茶室 No. 01 主題郵票',
    cover: {
      width: 1600,
      height: 1000,
      src: `${OSMANTHUS}-cover-800.png`,
      webp: [
        [`${OSMANTHUS}-cover-480.webp`, 480],
        [`${OSMANTHUS}-cover-800.webp`, 800],
        [`${OSMANTHUS}-cover-1200.webp`, 1200],
        [`${OSMANTHUS}-cover-1600.webp`, 1600],
      ],
      png: [
        [`${OSMANTHUS}-cover-800.png`, 800],
        [`${OSMANTHUS}-cover-1600.png`, 1600],
      ],
    },
    /** 畫面寬度低於 160px 才用這張，小字已經拿掉。 */
    simple: {
      width: 160,
      height: 213,
      src: `${OSMANTHUS}-stamp-simple-320.png`,
      webp: [
        [`${OSMANTHUS}-stamp-simple-160.webp`, 160],
        [`${OSMANTHUS}-stamp-simple-320.webp`, 320],
      ],
      png: [
        [`${OSMANTHUS}-stamp-simple-160.png`, 160],
        [`${OSMANTHUS}-stamp-simple-320.png`, 320],
      ],
    },
    share: `${OSMANTHUS}-share.png`,
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

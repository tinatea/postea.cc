import fs from 'node:fs';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { splitEvents, formatEventDate } from '../src/lib/classify.mjs';
import { buildMonthGrid, defaultMonth, shortEventName } from '../src/lib/calendar.mjs';
import { eventsFromCsv, loadOfferings, parseEventsCsv, parseNewsCsv } from '../src/lib/load.ts';
import {
  eventJsonLd,
  isPromoted,
  LINE_NOTE,
  publishedOnly,
  resolveSignup,
} from '../src/lib/signup.mjs';
import { themeArt } from '../src/lib/theme-art.mjs';
import { venueNote } from '../src/lib/venues.mjs';

const events = yaml.load(fs.readFileSync('src/data/events.yml', 'utf8'), {
  schema: yaml.JSON_SCHEMA,
});
assert.ok(Array.isArray(events) && events.length >= 1, 'events.yml 至少要有一場');

const first = events[0];
assert.equal(first.date, '2026-11-21');
assert.equal(first.startTime, '14:00');
assert.equal(first.endTime, '16:15');
assert.equal(first.registrationUrl, '');
assert.equal(first.accentColor, '#D9A441');
assert.equal(first.venue, '士林 凹屋珈琲（寵物友善）');
assert.equal(first.price, 'NT$1,000／人（附一杯桂花飲品）');
assert.equal(first.capacity, '限額 10 人，確定開課');
assert.equal(first.id, 'osmanthus-tea-room-2026-11');
assert.equal(first.title, '「晚寄的桂花」每月主題調香小聚 #1');
assert.match(first.description, /秋天的桂花到了尾聲，晚了一點寄給妳。/);
assert.match(first.description, /入座先喝一口店裡的桂花飲品，再開始調香/);
assert.equal(first.description.includes('桂花烏龍'), false);
assert.match(first.takeHome, /10ml/);
assert.match(first.takeHome, /配方卡/);

const forbidden = ['損益', '成本', '利潤', '小樹屋', '天南星', '紅豆杉', '租金', '成團'];
for (const word of forbidden) {
  assert.equal(first.description.includes(word), false, `說明不該出現內部字眼：${word}`);
}

const { upcoming, past } = splitEvents(
  [
    { date: '2026-11-21', startTime: '14:00', title: 'future' },
    { date: '2026-01-01', startTime: '10:00', title: 'old' },
    { date: '2026-10-15', startTime: '09:00', title: 'today' },
  ],
  '2026-10-15',
);
assert.deepEqual(
  upcoming.map((event) => event.title),
  ['today', 'future'],
);
assert.deepEqual(
  past.map((event) => event.title),
  ['old'],
);
assert.equal(formatEventDate('2026-11-21'), '2026年11月21日（六）');

const moved = splitEvents([{ date: '2026-11-21', startTime: '14:00', title: 'osmanthus' }], '2026-11-22');
assert.equal(moved.past[0].title, 'osmanthus');
assert.equal(moved.upcoming.length, 0);

assert.equal(fs.existsSync('src/data/products.csv'), false);
assert.equal(fs.existsSync('src/components/Offerings.astro'), false);

const sheet = eventsFromCsv(
  '標題,日期,開始時間,結束時間,地點,價格,人數,說明,帶走,報名連結,主題色\n測試場,2026-12-01,14:00,16:00,台北,"NT$1,000／人",限額 10 人，確定開課,說明,一瓶,,#D9A441\n',
);
assert.equal(sheet.length, 1);
assert.equal(sheet[0].title, '測試場');
assert.equal(sheet[0].registrationUrl, '');
assert.equal(sheet[0].accentColor, '#D9A441');
assert.equal(eventsFromCsv('not,a,header\nx,y,z\n').length, 0);

const sheetLiveShape = parseEventsCsv(
  '"活動代號","活動名稱","日期","開始時間","結束時間","地點","費用","人數","帶走的東西","報名連結","主題色","活動介紹","備註"\n"id-1","測試場","2026-12-01","14:00","16:00","台北","NT$1,000／人","限額 10 人，確定開課","","","#D9A441","第一段\n\n第二段","忽略"\n',
);
assert.equal(sheetLiveShape.error, null);
assert.equal(sheetLiveShape.events[0].id, 'id-1');
assert.equal(sheetLiveShape.events[0].takeHome, '');
assert.match(sheetLiveShape.events[0].description, /第一段\n\n第二段/);
const badAccent = parseEventsCsv('活動名稱,日期,主題色\n測試場,2026-12-01,#GGG\n');
assert.match(badAccent.error, /主題色/);
assert.equal(eventsFromCsv('活動名稱,日期,主題色\n測試場,2026-12-01,#GGG\n').length, 0);

const newsSheet = parseNewsCsv(
  '日期,標題,內文,連結,圖片連結,顯示,備註\n2026-10-16,較舊,內文,,,"是",忽略\n2026-10-01,隱藏,內文,,,"否",\n2026-10-20,較新,內文,https://postea.cc/events/,,是,\n',
);
assert.equal(newsSheet.error, null);
assert.deepEqual(
  newsSheet.items.map((item) => item.title),
  ['較新', '較舊'],
);
assert.equal(newsSheet.items[0].link, 'https://postea.cc/events/');
assert.match(parseNewsCsv('日期,標題,內文,連結,圖片連結,顯示\n2026-10-16,標題,內文,,,也許\n').error, /顯示/);

const news = yaml.load(fs.readFileSync('src/data/news.yml', 'utf8'), { schema: yaml.JSON_SCHEMA });
assert.equal(news[0].date, '2026-10-16');
assert.equal(news[0].title, '第一場主題小聚「晚寄的桂花」11/21 登場');
assert.match(news[0].link, /postea\.cc\/events/);
assert.match(news[0].body, /限額 10 人，確定開課/);
assert.match(news[0].body, /士林 凹屋珈琲（寵物友善）/);
assert.match(news[0].body, /NT\$1,000／人（附一杯桂花飲品）/);

const theme = fs.readFileSync('src/styles/theme.css', 'utf8');
for (const hex of ['#FAFAFA', '#F2EEEB', '#454545', '#62A297', '#3A7268', '#AF3332', '#66704F', '#D9A441', '#3A2C10']) {
  assert.ok(theme.includes(hex), `theme.css 缺少 ${hex}`);
}
assert.equal(theme.includes('#D4082C'), false);
assert.equal(theme.includes('#545454'), false);
assert.match(theme, /LXGW WenKai TC/);
assert.equal(theme.includes('Noto'), false);
assert.equal(theme.includes('ZCOOL'), false);
const fontLink = fs.readFileSync('src/layouts/Base.astro', 'utf8');
assert.match(fontLink, /family=LXGW\+WenKai\+TC:wght@300;400;700/);
assert.equal(fontLink.includes('Noto'), false);
assert.equal(fontLink.includes('ZCOOL'), false);
assert.equal(fontLink.includes('Postéa'), false);

const site = yaml.load(fs.readFileSync('src/data/site.yml', 'utf8'), { schema: yaml.JSON_SCHEMA });
assert.equal(site.wordmark, 'POSTÈA');
assert.equal(site.name, 'Postèa 香語所');
assert.match(site.lineUrl, /@144eqxql/);
assert.equal(site.lineId, '@144eqxql');
assert.match(site.xUrl, /postea_scent/);
assert.equal(site.sheetId, '1VIyh9mh76vbfhPye9M4UE1KYYs0ORjj-hxTGaeFwiGg');

const offerings = yaml.load(fs.readFileSync('src/data/offerings.yml', 'utf8'), {
  schema: yaml.JSON_SCHEMA,
});
assert.equal(offerings.explore.title, '調香探索與體驗');
assert.equal(offerings.explore.subtitle, '為你一個人調的香');
assert.match(offerings.explore.body, /或一瓶 50ml 空間噴霧/);
assert.deepEqual(
  offerings.explore.prices.map((price) => price.label),
  ['一對一', '兩人同行', '三至四人同行'],
);
assert.deepEqual(
  offerings.explore.prices.map((price) => price.amount),
  ['2,000', '1,800', '1,600'],
);
assert.equal(offerings.explore.duration, '約 1.5 至 2 小時');
assert.equal(offerings.explore.sprayVolume, '50ml');
assert.equal(offerings.explore.cta, '用 LINE 預約');
assert.equal(offerings.explore.href, 'https://line.me/R/ti/p/@144eqxql');
assert.equal(offerings.gathering.title, '每月主題調香');
assert.equal(offerings.gathering.prices[0].label, '每人');
assert.equal(offerings.gathering.prices[0].amount, '1,000');
assert.equal(offerings.gathering.prices[0].note, '含一杯飲品');
assert.equal(offerings.gathering.takeHome, '10ml 主題香水');
assert.equal(offerings.gathering.cta, '看本月主題');
assert.equal(offerings.gathering.href, '/events');
assert.ok(offerings.gathering.tags.includes('限額 10 人，確定開課'));
assert.equal(offerings.choose.title, '怎麼選？');
assert.match(offerings.choose.paragraphs[0], /選每月主題調香。/);
assert.match(offerings.choose.paragraphs[1], /選調香探索與體驗。/);
assert.equal(JSON.stringify(offerings).includes('待補'), false);
assert.equal(JSON.stringify(offerings).includes('＿'), false);
const loadedOfferings = loadOfferings();
assert.equal(loadedOfferings.explore.takeHome, '30ml 淡香水或 50ml 空間噴霧（二選一）');
assert.equal(loadedOfferings.explore.duration, '約 1.5 至 2 小時');
assert.equal(loadedOfferings.gathering.takeHome, '10ml 主題香水');
assert.equal(loadedOfferings.explore.takeHome.includes('＿'), false);
assert.equal(loadedOfferings.explore.prices.length, 3);
const experiences = fs.readFileSync('src/pages/experiences.astro', 'utf8');
assert.match(experiences, /用 LINE 預約|explore\.cta/);
assert.match(experiences, /calendar-blank/);
for (const file of ['README.md', 'src/pages/experiences.astro', 'src/pages/index.astro', 'docs/維護說明.md']) {
  const text = fs.readFileSync(file, 'utf8');
  for (const retired of ['$1500', '$2500', '香遇淡香水', '香信', '香遇空間噴霧', '保養油', '＿＿']) {
    assert.equal(text.includes(retired), false, `${file} 仍有舊價目：${retired}`);
  }
}

assert.equal(shortEventName(first.title), '晚寄的桂花');
const november = buildMonthGrid(2026, 11);
assert.equal(november[0], 1);
assert.equal(november[20], 21);
assert.equal(defaultMonth([{ date: '2026-11-21' }], '2026-10-15'), '2026-11');
assert.equal(fs.existsSync('src/pages/posters.astro'), false);
assert.equal(fs.existsSync('src/pages/events.astro'), false);
assert.equal(fs.existsSync('src/data/posters.yml'), false);
const header = fs.readFileSync('src/components/Header.astro', 'utf8');
assert.equal(header.includes('文宣'), false);
assert.match(header, /aria-label="選單"/);
assert.match(header, /name="list"/);
assert.match(header, /calendar-blank/);
assert.match(header, /newspaper/);
assert.match(header, /最新消息/);
assert.ok(fs.existsSync('src/pages/news/index.astro'));
const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
assert.match(workflow, /cron: '7 22 \* \* \*'/);
assert.equal(workflow.includes("cron: '30 16 * * *'"), false);
assert.match(workflow, /workflow_dispatch/);
const css = fs.readFileSync('src/styles/global.css', 'utf8');
assert.match(css, /details\.menu::details-content/);

const at = (iso) => new Date(iso);
const session = {
  id: 'osmanthus-tea-room-2026-11',
  title: '晚寄的桂花',
  date: '2026-11-21',
  startTime: '14:00',
  endTime: '16:15',
  venue: '士林 凹屋珈琲（寵物友善）',
  price: 'NT$1,000／人（附一杯桂花飲品）',
  capacity: '限額 10 人，確定開課',
  registrationUrl: '',
};
assert.equal(resolveSignup(session, at('2026-10-16T12:00:00+08:00')).status, '即將開放');
assert.equal(resolveSignup(session, at('2026-10-16T12:00:00+08:00')).action, 'line-ask');
assert.equal(resolveSignup(session, at('2026-10-16T12:00:00+08:00')).openLabel, '開放時間待公布');
assert.equal(resolveSignup({ ...session, signupStatus: '已取消' }, at('2026-12-01T12:00:00+08:00')).status, '已取消');
assert.equal(resolveSignup(session, at('2026-11-21T16:15:00+08:00')).status, '已結束');
assert.equal(resolveSignup(session, at('2026-11-21T14:00:00+08:00')).status, '報名截止');
assert.equal(resolveSignup(session, at('2026-11-21T13:59:00+08:00')).status, '即將開放');
const openWindow = {
  signupStatus: '報名中',
  signupOpen: '2026-11-01 10:00',
  signupClose: '2026-11-21 12:00',
};
assert.equal(
  resolveSignup({ ...session, ...openWindow, signupMethod: '表單' }, at('2026-11-10T12:00:00+08:00')).status,
  '即將開放',
);
assert.equal(
  resolveSignup(
    { ...session, ...openWindow, signupMethod: '表單', registrationUrl: 'https://forms.gle/abc' },
    at('2026-11-10T12:00:00+08:00'),
  ).action,
  'form',
);
assert.equal(
  resolveSignup({ ...session, ...openWindow, signupMethod: 'LINE' }, at('2026-11-10T12:00:00+08:00')).action,
  'line-register',
);
assert.equal(
  resolveSignup({ ...session, signupStatus: '已額滿' }, at('2026-11-10T12:00:00+08:00')).status,
  '即將開放',
);
assert.equal(
  resolveSignup(
    { ...session, signupStatus: '已額滿', signupOpen: '2026-12-01' },
    at('2026-10-16T12:00:00+08:00'),
  ).status,
  '即將開放',
);
assert.equal(
  resolveSignup(
    { ...session, signupStatus: '已額滿', signupOpen: '2026-11-01', signupClose: '2026-11-21 13:00' },
    at('2026-11-10T12:00:00+08:00'),
  ).status,
  '已額滿',
);
assert.equal(
  resolveSignup(
    { ...session, signupStatus: '報名中', signupOpen: '2026-11-01', registrationUrl: 'https://forms.gle/abc' },
    at('2026-10-16T12:00:00+08:00'),
  ).status,
  '即將開放',
);
assert.equal(resolveSignup({ ...session, signupStatus: '也許' }, at('2026-10-16T12:00:00+08:00')).status, '即將開放');
assert.equal(
  resolveSignup(
    {
      ...session,
      signupStatus: '報名中',
      signupOpen: '2026-11-01',
      signupClose: '2026-11-21 18:00',
      registrationUrl: 'https://forms.gle/abc',
    },
    at('2026-11-21T17:00:00+08:00'),
  ).status,
  '已結束',
);
assert.equal(
  resolveSignup(
    {
      ...session,
      signupStatus: '報名中',
      signupOpen: '2026-11-01',
      signupClose: '2026-11-20 18:00',
      registrationUrl: 'https://forms.gle/abc',
    },
    at('2026-11-20T18:00:00+08:00'),
  ).status,
  '報名截止',
);
assert.equal(isPromoted({ ...session, signupStatus: '已取消' }, at('2026-10-16T12:00:00+08:00')), false);
assert.equal(isPromoted(session, at('2026-10-16T12:00:00+08:00')), true);
assert.match(LINE_NOTE, /開啟 LINE 不代表報名完成/);

const optionalSheet = parseEventsCsv(
  '活動名稱,日期,發布狀態,報名狀態,報名開放時間,報名截止時間,報名方式\n公開場,2026-12-01,公開,報名中,下週三,不是時間,LINE\n草稿場,2026-12-02,草稿,,,,\n空白場,2026-12-03,,,,,\n',
);
assert.equal(optionalSheet.error, null);
assert.equal(optionalSheet.events[0].signupOpen, '下週三');
assert.equal(resolveSignup(optionalSheet.events[0], at('2026-10-16T12:00:00+08:00')).status, '即將開放');
assert.deepEqual(
  publishedOnly(optionalSheet.events).map((event) => event.title),
  ['公開場', '空白場'],
);
assert.equal(publishedOnly([{ title: '秘密', publishStatus: '秘密' }]).length, 1);
const detailLd = eventJsonLd(session, { siteUrl: 'https://postea.cc', name: 'Postèa 香語所' }, at('2026-10-16T12:00:00+08:00'));
assert.equal(detailLd.url, 'https://postea.cc/events/osmanthus-tea-room-2026-11/');
assert.equal(JSON.stringify(detailLd).includes('streetAddress'), false);
assert.equal(detailLd.offers, undefined);
const selling = eventJsonLd(
  { ...session, ...openWindow, signupMethod: '表單', registrationUrl: 'https://forms.gle/abc' },
  { siteUrl: 'https://postea.cc' },
  at('2026-11-10T12:00:00+08:00'),
);
assert.equal(selling.offers.url, 'https://forms.gle/abc');
assert.equal(selling.offers.price, '1000');
const place = venueNote(session.venue);
assert.equal(place.address, '台北市士林區中山北路五段 505 巷 44 弄 2 號');
assert.equal(place.transit, '捷運士林站 2 號出口，步行約 1–3 分鐘');
assert.equal(place.mapUrl, 'https://maps.app.goo.gl/KLmqCZhYWMfzdTNSA');
assert.equal(place.pet, '寵物友善，歡迎帶毛孩一起來');
assert.match(place.petCare, /香料和酒精對貓咪、鳥寶寶比較刺激/);
assert.equal(place.petCare.includes('精油'), false);
assert.equal(venueNote('台北市區'), null);
assert.equal(JSON.stringify(detailLd).includes('505 巷'), false);

const art = themeArt({ id: 'osmanthus-tea-room-2026-11', title: '晚寄的桂花' });
assert.equal(art.alt, '晚寄的桂花 No. 01 主題郵票');
assert.equal(art.cover.width, 1600);
assert.equal(art.cover.height, 1000);
assert.equal(art.simple.width, 160);
assert.equal(art.shareWidth, 1200);
assert.equal(art.shareHeight, 630);
for (const file of [
  art.cover.src,
  art.share,
  art.simple.src,
  ...art.cover.webp.map(([src]) => src),
  ...art.cover.png.map(([src]) => src),
  ...art.simple.webp.map(([src]) => src),
  ...art.simple.png.map(([src]) => src),
]) {
  assert.ok(fs.existsSync(`public${file}`), `缺少主題圖 ${file}`);
}
const coverSheet = parseEventsCsv('活動名稱,日期,封面圖\n測試場,2026-12-01,https://postea.cc/cover.png\n');
assert.equal(coverSheet.error, null);
assert.equal(coverSheet.events[0].coverImage, 'https://postea.cc/cover.png');
assert.equal(themeArt(coverSheet.events[0]).custom, 'https://postea.cc/cover.png');
const badCover = parseEventsCsv('活動名稱,日期,封面圖\n測試場,2026-12-01,不是網址\n');
assert.equal(badCover.error, null);
assert.equal(themeArt({ id: 'osmanthus-tea-room-2026-11', coverImage: '不是網址' }).share.endsWith('share.png'), true);

const bannedPhrases = [`滿 ${4} 人`, `4–${10} 人`, `4-${10} 人`, `未滿 ${4} 人`];
function collectText(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) collectText(full, acc);
    else if (/\.(astro|yml|yaml|md|mjs|ts|css|html)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}
for (const file of [...collectText('src'), ...collectText('docs'), ...collectText('content'), ...collectText('scripts'), 'README.md']) {
  const text = fs.readFileSync(file, 'utf8');
  for (const phrase of bannedPhrases) {
    assert.equal(text.includes(phrase), false, `${file} 仍有最低人數寫法`);
  }
}
for (const file of ['src/pages/about.astro', 'src/pages/experiences.astro', 'src/data/site.yml', 'src/components/EventDetail.astro']) {
  assert.equal(fs.readFileSync(file, 'utf8').includes('TODO'), false, `${file} 仍有待辦字樣`);
}
assert.equal(fs.readFileSync('src/pages/experiences.astro', 'utf8').includes('studio-table'), false);
assert.equal(site.about.includes('TODO'), false);

assert.equal(fs.readFileSync('public/CNAME', 'utf8').trim(), 'postea.cc');
assert.equal(fs.existsSync('public/brand/stamp.png'), false);
assert.ok(fs.existsSync('public/brand/stamp.svg'));
assert.ok(fs.existsSync('public/brand/logo.svg'));
const logoPng = fs.readFileSync('public/brand/logo.png');
assert.equal(logoPng.toString('ascii', 12, 16), 'IHDR');
assert.equal(logoPng.readUInt32BE(16), 1200);
assert.equal(logoPng.readUInt32BE(20), 924);
const ogPng = fs.readFileSync('public/brand/og.png');
assert.equal(ogPng.toString('ascii', 12, 16), 'IHDR');
assert.equal(ogPng.readUInt32BE(16), 1200);
assert.equal(ogPng.readUInt32BE(20), 630);
assert.ok(ogPng.length < 300 * 1024, 'og.png 超過 300KB');
const fav = fs.readFileSync('public/favicon.png');
assert.equal(fav.toString('ascii', 12, 16), 'IHDR');
assert.equal(fav.readUInt32BE(16), 192);
assert.equal(fav.readUInt32BE(20), 192);
const fav32 = fs.readFileSync('public/favicon-32.png');
assert.equal(fav32.readUInt32BE(16), 32);
assert.equal(fav32.readUInt32BE(20), 32);
for (const file of ['src/components/Header.astro', 'src/pages/index.astro']) {
  const text = fs.readFileSync(file, 'utf8');
  assert.equal(text.includes('stamp.svg'), true, `${file} 沒用向量郵票`);
  assert.equal(text.includes('stamp.png'), false, `${file} 仍指向點陣郵票`);
  assert.equal(text.includes('logo.png'), false, `${file} 不該用完整標誌`);
}
assert.equal(fs.readFileSync('README.md', 'utf8').includes('public/brand/logo.png'), true);
assert.ok(fs.existsSync('content/recaps/_example.md'));

console.log('check ok');

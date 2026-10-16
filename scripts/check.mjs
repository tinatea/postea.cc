import fs from 'node:fs';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { splitEvents, formatEventDate } from '../src/lib/classify.mjs';
import { buildMonthGrid, defaultMonth, shortEventName } from '../src/lib/calendar.mjs';
import { eventsFromCsv, parseEventsCsv, parseNewsCsv } from '../src/lib/load.ts';

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
assert.equal(first.venue, '台北市｜捷運南京復興站旁（詳細地址報名後通知）');
assert.equal(first.price, 'NT$800／人');
assert.equal(first.capacity, '4–10 人（滿 4 人開課）');
assert.match(first.title, /桂花茶室/);
assert.match(first.description, /Tina 會帶大家一支一支聞香、講解，中場一起喝一壺桂花烏龍，分享彼此調出的茶室。/);
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
  '標題,日期,開始時間,結束時間,地點,價格,人數,說明,帶走,報名連結,主題色\n測試場,2026-12-01,14:00,16:00,台北,NT$800／人,4–10 人,說明,一瓶,,#D9A441\n',
);
assert.equal(sheet.length, 1);
assert.equal(sheet[0].title, '測試場');
assert.equal(sheet[0].registrationUrl, '');
assert.equal(sheet[0].accentColor, '#D9A441');
assert.equal(eventsFromCsv('not,a,header\nx,y,z\n').length, 0);

const sheetLiveShape = parseEventsCsv(
  '"活動代號","活動名稱","日期","開始時間","結束時間","地點","費用","人數","帶走的東西","報名連結","主題色","活動介紹","備註"\n"id-1","測試場","2026-12-01","14:00","16:00","台北","NT$800／人","4–10 人","","","#D9A441","第一段\n\n第二段","忽略"\n',
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
assert.equal(news[0].title, '第一場主題小聚「桂花茶室」11/21 登場');
assert.match(news[0].link, /postea\.cc\/events/);

const theme = fs.readFileSync('src/styles/theme.css', 'utf8');
for (const hex of ['#FAFAFA', '#F2EEEB', '#545454', '#62A297', '#D4082C', '#899272', '#A2EAF1']) {
  assert.ok(theme.includes(hex), `theme.css 缺少 ${hex}`);
}
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
assert.match(offerings.explore.body, /兩到四人同行，各自調出自己的那一瓶。/);
assert.deepEqual(offerings.explore.prices, ['一對一 NT$2,000', '兩至四人同行，每人 NT$1,800']);
assert.equal(offerings.explore.cta, '用 LINE 預約');
assert.equal(offerings.explore.href, 'https://line.me/R/ti/p/@144eqxql');
assert.equal(offerings.gathering.title, '每月主題調香');
assert.equal(offerings.gathering.prices[0], '每人 NT$800');
assert.equal(offerings.gathering.cta, '看本月主題');
assert.equal(offerings.gathering.href, '/events');
assert.equal(offerings.choose.title, '怎麼選？');
assert.match(offerings.choose.paragraphs[0], /選每月主題調香。/);
assert.match(offerings.choose.paragraphs[1], /選調香探索與體驗。/);
assert.equal(JSON.stringify(offerings).includes('待補'), false);
const experiences = fs.readFileSync('src/pages/experiences.astro', 'utf8');
assert.match(experiences, /用 LINE 預約|explore\.cta/);
assert.match(experiences, /calendar-blank/);
for (const file of ['README.md', 'src/pages/experiences.astro', 'src/pages/index.astro', 'docs/維護說明.md']) {
  const text = fs.readFileSync(file, 'utf8');
  for (const retired of ['$1500', '$2500', '香遇淡香水', '香信', '空間噴霧', '保養油']) {
    assert.equal(text.includes(retired), false, `${file} 仍有舊價目：${retired}`);
  }
}

assert.equal(shortEventName(first.title), '桂花茶室');
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

assert.equal(fs.readFileSync('public/CNAME', 'utf8').trim(), 'postea.cc');
assert.ok(fs.existsSync('public/brand/stamp.svg'));
assert.ok(fs.existsSync('public/brand/logo.png'));
assert.ok(fs.existsSync('content/recaps/_example.md'));

console.log('check ok');

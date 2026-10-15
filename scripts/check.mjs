import fs from 'node:fs';
import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { splitEvents, formatEventDate } from '../src/lib/classify.mjs';
import { parseProducts } from '../src/lib/products.mjs';
import { eventsFromCsv } from '../src/lib/load.ts';

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

const groups = parseProducts(fs.readFileSync('src/data/products.csv', 'utf8'));
const items = groups.flatMap((group) => group.items);
assert.equal(items.length, 7);
assert.equal(groups[0].heading, '體驗項目');
assert.equal(groups[0].items[0].name, '香氛體驗  - 香遇淡香水');
assert.equal(groups[0].items[0].price, '$1500');
assert.match(groups[0].items[0].description, /15ml/);
assert.match(groups[0].items[0].duration, /10 ~ 20 分鐘/);
assert.match(groups[0].items[1].duration, /1 小時/);
assert.equal(groups[1].heading, '商品');
assert.equal(groups[1].items[0].name, '香語空間噴霧');
assert.equal(groups[1].items[1].name, '香語繩保養油');
assert.equal(groups[1].items[1].price, '$800');
assert.equal(groups[1].items[2].name, '推廣噴霧');
assert.equal(groups[1].items[2].price, '400');
assert.equal(groups[1].items[2].description, '');
assert.equal(groups[1].items[2].duration, null);

const sheet = eventsFromCsv(
  '標題,日期,開始時間,結束時間,地點,價格,人數,說明,帶走,報名連結,主題色\n測試場,2026-12-01,14:00,16:00,台北,NT$800／人,4–10 人,說明,一瓶,,#D9A441\n',
);
assert.equal(sheet.length, 1);
assert.equal(sheet[0].title, '測試場');
assert.equal(sheet[0].registrationUrl, '');
assert.equal(sheet[0].accentColor, '#D9A441');
assert.equal(eventsFromCsv('not,a,header\nx,y,z\n').length, 0);

const theme = fs.readFileSync('src/styles/theme.css', 'utf8');
for (const hex of ['#B8272F', '#CDEBEF', '#F7F1EA', '#F0E4E4', '#2B3445', '#C98A3D', '#D8B88A']) {
  assert.ok(theme.includes(hex), `theme.css 缺少 ${hex}`);
}

assert.equal(fs.readFileSync('public/CNAME', 'utf8').trim(), 'postea.cc');
assert.ok(fs.existsSync('public/brand/logo.png'));
assert.ok(fs.existsSync('content/recaps/_example.md'));

console.log('check ok');

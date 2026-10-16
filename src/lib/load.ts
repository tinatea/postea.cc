import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { marked } from 'marked';
import { parseCsv, parseProducts } from './products.mjs';
import type { NewsItem, OfferingPoint, Offerings, ProductGroup, Recap, SiteConfig, WorkshopEvent } from './types';

const root = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readYaml(relativePath: string): unknown {
  return yaml.load(readText(relativePath), { schema: yaml.JSON_SCHEMA });
}

function asString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

const ACCENT = /^#[0-9A-Fa-f]{6}$/;

export function loadSite(): SiteConfig {
  const raw = readYaml('src/data/site.yml');
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: asString(data.name) || 'Postèa 香語所',
    wordmark: asString(data.wordmark) || 'POSTÈA',
    nameZh: asString(data.nameZh) || '香語所',
    tagline: asString(data.tagline),
    bio: asString(data.bio),
    instagram: asString(data.instagram),
    instagramHandle: asString(data.instagramHandle),
    lineUrl: asString(data.lineUrl),
    lineId: asString(data.lineId),
    xUrl: asString(data.xUrl),
    xHandle: asString(data.xHandle),
    siteUrl: asString(data.siteUrl) || 'https://postea.cc',
    about: asString(data.about),
    sheetId: asString(data.sheetId),
  };
}

export function normalizeEvent(raw: Record<string, unknown>, index: number): WorkshopEvent | null {
  const title = asString(raw.title);
  const date = asString(raw.date).slice(0, 10);
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const accent = asString(raw.accentColor);
  const id = asString(raw.id) || `event-${date}-${index + 1}`;
  return {
    id: id.replace(/\s+/g, '-'),
    title,
    date,
    startTime: asString(raw.startTime),
    endTime: asString(raw.endTime),
    venue: asString(raw.venue),
    price: asString(raw.price),
    capacity: asString(raw.capacity),
    description: asString(raw.description),
    takeHome: asString(raw.takeHome),
    registrationUrl: asString(raw.registrationUrl),
    accentColor: ACCENT.test(accent) ? accent.toUpperCase() : undefined,
  };
}

function loadLocalEvents(): WorkshopEvent[] {
  const raw = readYaml('src/data/events.yml');
  const list = Array.isArray(raw) ? raw : [];
  return list.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const event = normalizeEvent(item as Record<string, unknown>, index);
    return event ? [event] : [];
  });
}

const HEADER_ALIAS: Record<string, keyof WorkshopEvent> = {
  id: 'id',
  代號: 'id',
  活動代號: 'id',
  title: 'title',
  標題: 'title',
  名稱: 'title',
  活動名稱: 'title',
  date: 'date',
  日期: 'date',
  starttime: 'startTime',
  開始: 'startTime',
  開始時間: 'startTime',
  endtime: 'endTime',
  結束: 'endTime',
  結束時間: 'endTime',
  venue: 'venue',
  地點: 'venue',
  price: 'price',
  價格: 'price',
  費用: 'price',
  capacity: 'capacity',
  人數: 'capacity',
  description: 'description',
  說明: 'description',
  介紹: 'description',
  活動介紹: 'description',
  takehome: 'takeHome',
  帶走: 'takeHome',
  帶走的東西: 'takeHome',
  registrationurl: 'registrationUrl',
  報名連結: 'registrationUrl',
  報名: 'registrationUrl',
  accentcolor: 'accentColor',
  主題色: 'accentColor',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function headerKey(cell: string): keyof WorkshopEvent | undefined {
  const trimmed = cell.trim();
  if (HEADER_ALIAS[trimmed]) return HEADER_ALIAS[trimmed];
  return HEADER_ALIAS[trimmed.toLowerCase().replace(/\s+/g, '')];
}

export function parseEventsCsv(text: string): { events: WorkshopEvent[]; error: string | null } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { events: [], error: '活動表沒有標題列' };
  const keys = rows[0].map((cell) => headerKey(cell));
  if (!keys.includes('title') || !keys.includes('date')) {
    return { events: [], error: '活動表缺少「活動名稱」或「日期」欄' };
  }
  const events: WorkshopEvent[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const record: Record<string, unknown> = {};
    keys.forEach((key, cellIndex) => {
      if (key) record[key] = row[cellIndex] ?? '';
    });
    const mapped = Object.values(record).map((value) => asString(value));
    if (mapped.every((value) => value === '')) continue;
    const rowNumber = index + 1;
    const title = asString(record.title);
    const date = asString(record.date);
    if (!title) return { events: [], error: `活動表第 ${rowNumber} 列沒有活動名稱` };
    if (!DATE_RE.test(date)) {
      return { events: [], error: `活動表第 ${rowNumber} 列的日期要寫成 2026-11-21，現在是「${date}」` };
    }
    const accent = asString(record.accentColor);
    if (accent && !ACCENT.test(accent)) {
      return { events: [], error: `活動表第 ${rowNumber} 列的主題色要寫成 #D9A441，現在是「${accent}」` };
    }
    const event = normalizeEvent(record, index);
    if (!event) return { events: [], error: `活動表第 ${rowNumber} 列無法讀取` };
    events.push(event);
  }
  if (events.length === 0) return { events: [], error: '活動表沒有任何一場活動' };
  return { events, error: null };
}

export function eventsFromCsv(text: string): WorkshopEvent[] {
  const parsed = parseEventsCsv(text);
  return parsed.error ? [] : parsed.events;
}

const EVENTS_TAB = '活動';
const NEWS_TAB = '最新消息';

function sheetCsvUrl(sheetId: string, tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

async function fetchSheetCsv(sheetId: string, tab: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(sheetCsvUrl(sheetId, tab), {
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
        headers: { 'user-agent': 'postea-cc-build' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const trimmed = text.trim();
      if (!trimmed || trimmed.startsWith('<')) throw new Error('回應不是 CSV（試算表可能還沒公開）');
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

let eventsPromise: Promise<WorkshopEvent[]> | undefined;

export function loadEvents(): Promise<WorkshopEvent[]> {
  eventsPromise ??= loadEventsOnce();
  return eventsPromise;
}

async function loadEventsOnce(): Promise<WorkshopEvent[]> {
  const local = loadLocalEvents();
  const sheetId = loadSite().sheetId;
  if (!sheetId) {
    console.warn(`[postea] 活動：沒有填 sheetId，使用 src/data/events.yml（${local.length} 場）`);
    return local;
  }
  try {
    const text = await fetchSheetCsv(sheetId, EVENTS_TAB);
    const parsed = parseEventsCsv(text);
    if (parsed.error) throw new Error(parsed.error);
    console.warn(`[postea] 活動：使用 Google 試算表「${EVENTS_TAB}」（${parsed.events.length} 場）`);
    return parsed.events;
  } catch (error) {
    console.warn(`[postea] 活動：試算表讀取或格式有問題，改用 src/data/events.yml（${local.length} 場）。原因：${error}`);
    return local;
  }
}

const NEWS_ALIAS: Record<string, keyof NewsItem | 'visible'> = {
  日期: 'date',
  date: 'date',
  標題: 'title',
  title: 'title',
  內文: 'body',
  body: 'body',
  連結: 'link',
  link: 'link',
  圖片連結: 'image',
  image: 'image',
  顯示: 'visible',
  visible: 'visible',
};

function newsHeader(cell: string): keyof NewsItem | 'visible' | undefined {
  const trimmed = cell.trim();
  if (NEWS_ALIAS[trimmed]) return NEWS_ALIAS[trimmed];
  return NEWS_ALIAS[trimmed.toLowerCase().replace(/\s+/g, '')];
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function parseNewsCsv(text: string): { items: NewsItem[]; error: string | null } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { items: [], error: '最新消息沒有標題列' };
  const keys = rows[0].map((cell) => newsHeader(cell));
  if (!keys.includes('title') || !keys.includes('date') || !keys.includes('visible')) {
    return { items: [], error: '最新消息缺少「日期」、「標題」或「顯示」欄' };
  }
  const items: NewsItem[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const record: Record<string, string> = {};
    keys.forEach((key, cellIndex) => {
      if (key) record[key] = row[cellIndex] ?? '';
    });
    const mapped = Object.values(record).map((value) => asString(value));
    if (mapped.every((value) => value === '')) continue;
    const visible = asString(record.visible);
    if (visible === '' || visible === '否') continue;
    const rowNumber = index + 1;
    if (visible !== '是') {
      return { items: [], error: `最新消息第 ${rowNumber} 列的「顯示」只能填「是」或「否」，現在是「${visible}」` };
    }
    const title = asString(record.title);
    const date = asString(record.date);
    if (!title) return { items: [], error: `最新消息第 ${rowNumber} 列沒有標題` };
    if (!DATE_RE.test(date)) {
      return { items: [], error: `最新消息第 ${rowNumber} 列的日期要寫成 2026-10-16，現在是「${date}」` };
    }
    const link = asString(record.link);
    const image = asString(record.image);
    if (link && !isHttpUrl(link)) {
      return { items: [], error: `最新消息第 ${rowNumber} 列的連結要以 http:// 或 https:// 開頭` };
    }
    if (image && !isHttpUrl(image)) {
      return { items: [], error: `最新消息第 ${rowNumber} 列的圖片連結要以 http:// 或 https:// 開頭` };
    }
    items.push({
      date,
      title,
      body: asString(record.body),
      link,
      image,
    });
  }
  items.sort((a, b) => b.date.localeCompare(a.date) || b.title.localeCompare(a.title, 'zh-Hant'));
  return { items, error: null };
}

function loadLocalNews(): NewsItem[] {
  const raw = readYaml('src/data/news.yml');
  const list = Array.isArray(raw) ? raw : [];
  return list.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const title = asString(record.title);
    const date = asString(record.date).slice(0, 10);
    if (!title || !DATE_RE.test(date)) return [];
    return [
      {
        date,
        title,
        body: asString(record.body),
        link: asString(record.link),
        image: asString(record.image),
      } satisfies NewsItem,
    ];
  }).sort((a, b) => b.date.localeCompare(a.date) || b.title.localeCompare(a.title, 'zh-Hant'));
}

let newsPromise: Promise<NewsItem[]> | undefined;

export function loadNews(): Promise<NewsItem[]> {
  newsPromise ??= loadNewsOnce();
  return newsPromise;
}

async function loadNewsOnce(): Promise<NewsItem[]> {
  const local = loadLocalNews();
  const sheetId = loadSite().sheetId;
  if (!sheetId) {
    console.warn(`[postea] 最新消息：沒有填 sheetId，使用 src/data/news.yml（${local.length} 則）`);
    return local;
  }
  try {
    const text = await fetchSheetCsv(sheetId, NEWS_TAB);
    const parsed = parseNewsCsv(text);
    if (parsed.error) throw new Error(parsed.error);
    console.warn(`[postea] 最新消息：使用 Google 試算表「${NEWS_TAB}」（${parsed.items.length} 則）`);
    return parsed.items;
  } catch (error) {
    console.warn(`[postea] 最新消息：試算表讀取或格式有問題，改用 src/data/news.yml（${local.length} 則）。原因：${error}`);
    return local;
  }
}

const POINT_TONES = new Set(['sage', 'red', 'aqua']);

export function loadOfferings(): Offerings {
  const raw = readYaml('src/data/offerings.yml');
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const solo = (data.solo && typeof data.solo === 'object' ? data.solo : {}) as Record<string, unknown>;
  const gathering = (
    data.gathering && typeof data.gathering === 'object' ? data.gathering : {}
  ) as Record<string, unknown>;
  const points = Array.isArray(gathering.points) ? gathering.points : [];
  return {
    solo: {
      name: asString(solo.name),
      kind: asString(solo.kind),
      pill: asString(solo.pill),
    },
    gathering: {
      name: asString(gathering.name),
      kind: asString(gathering.kind),
      pill: asString(gathering.pill),
      price: asString(gathering.price),
      points: points.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const record = item as Record<string, unknown>;
        const title = asString(record.title);
        const body = asString(record.body);
        if (!title || !body) return [];
        const tone = asString(record.tone);
        const point: OfferingPoint = {
          title,
          body,
          tone: POINT_TONES.has(tone) ? (tone as OfferingPoint['tone']) : 'sage',
        };
        return [point];
      }),
    },
  };
}

export function loadProducts(): ProductGroup[] {
  return parseProducts(readText('src/data/products.csv')) as ProductGroup[];
}

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  return {
    data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {},
    body: match[2] ?? '',
  };
}

function asPhotos(value: unknown): { src: string; alt: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const src = asString(record.src);
    if (!src) return [];
    return [{ src, alt: asString(record.alt) }];
  });
}

export function loadRecaps(): Recap[] {
  const dir = path.join(root, 'content/recaps');
  if (!fs.existsSync(dir)) return [];
  const recaps = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md') && !path.basename(file).startsWith('_'))
    .flatMap((file) => {
      const { data, body } = parseFrontmatter(readText(path.join('content/recaps', file)));
      if (data.published === false) return [];
      const title = asString(data.title);
      const date = asString(data.date).slice(0, 10);
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
      const slug = file.replace(/\.md$/, '');
      return [
        {
          slug,
          title,
          date,
          excerpt: asString(data.excerpt),
          cover: asString(data.cover) || undefined,
          photos: asPhotos(data.photos),
          body: body.trim(),
        } satisfies Recap,
      ];
    });
  return recaps.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false }) as string;
}

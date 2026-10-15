import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { marked } from 'marked';
import { parseCsv, parseProducts } from './products.mjs';
import type { OfferingPoint, Offerings, ProductGroup, Recap, SiteConfig, WorkshopEvent } from './types';

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
    eventsSheetUrl: asString(data.eventsSheetUrl),
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
  title: 'title',
  標題: 'title',
  名稱: 'title',
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
  takehome: 'takeHome',
  帶走: 'takeHome',
  registrationurl: 'registrationUrl',
  報名連結: 'registrationUrl',
  報名: 'registrationUrl',
  accentcolor: 'accentColor',
  主題色: 'accentColor',
};

function headerKey(cell: string): keyof WorkshopEvent | undefined {
  const trimmed = cell.trim();
  if (HEADER_ALIAS[trimmed]) return HEADER_ALIAS[trimmed];
  return HEADER_ALIAS[trimmed.toLowerCase().replace(/\s+/g, '')];
}

export function eventsFromCsv(text: string): WorkshopEvent[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const keys = rows[0].map((cell) => headerKey(cell));
  if (!keys.includes('title') || !keys.includes('date')) return [];
  return rows.slice(1).flatMap((row, index) => {
    const record: Record<string, unknown> = {};
    keys.forEach((key, cellIndex) => {
      if (key) record[key] = row[cellIndex] ?? '';
    });
    const event = normalizeEvent(record, index);
    return event ? [event] : [];
  });
}

export async function loadEvents(): Promise<WorkshopEvent[]> {
  const local = loadLocalEvents();
  const url = loadSite().eventsSheetUrl;
  if (!url) return local;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.trim().startsWith('<')) throw new Error('回應不是 CSV');
    const remote = eventsFromCsv(text);
    if (remote.length === 0) throw new Error('試算表沒有讀到任何一場活動');
    console.warn(`[postea] 使用 Google 試算表的 ${remote.length} 場活動`);
    return remote;
  } catch (error) {
    console.warn(`[postea] 讀不到活動試算表，改用 data/events.yml。原因：${error}`);
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

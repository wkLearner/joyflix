import { fetchDoubanData } from '@/lib/douban';
import { DoubanItem } from '@/lib/types';

import { CHILD_CATALOG, ChildCatalogEntry } from './children-catalog';

interface SuggestItem {
  id: string;
  title: string;
  year?: string;
  img?: string;
  sub_title?: string;
}

interface SearchSubject {
  id: number | string;
  title: string;
  cover_url?: string;
  rating?: { value?: number; rating_info?: string };
  tpl_name?: string;
}

export interface ChildShelfItem extends DoubanItem {
  group: string;
}

interface ShelfCache {
  at: number;
  items: ChildShelfItem[];
  missing: string[];
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const LOOKUP_CONCURRENCY = 4;

let shelfCache: ShelfCache | null = null;

const DOUBAN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://www.douban.com/',
  Accept: 'text/html,application/json,text/plain,*/*',
};

function normalizeTitle(value: string): string {
  return value.replace(/\u200e/g, '').replace(/\s+/g, '').toLowerCase();
}

function cleanTitle(title: string): string {
  const withoutMark = title.replace(/\u200e/g, '').replace(/\s*\(\d{4}\)\s*$/, '').trim();
  const chinese = withoutMark.match(/^(.*[\u4e00-\u9fff])(?:\s+[A-Za-z0-9].*)?$/);
  return (chinese ? chinese[1] : withoutMark).trim();
}

function yearFromTitle(title: string): string {
  return title.match(/\((\d{4})\)\s*$/)?.[1] || '';
}

function titleCandidates(title: string): string[] {
  const plain = title.replace(/\u200e/g, '').trim();
  const withoutYear = plain.replace(/\s*\(\d{4}\)\s*$/, '').trim();
  return [plain, withoutYear, cleanTitle(title)].map(normalizeTitle);
}

function matchesEntry(
  title: string,
  year: string,
  entry: ChildCatalogEntry
): boolean {
  const candidates = titleCandidates(title);
  const expected = normalizeTitle(entry.titleIncludes);
  const hit = entry.exact
    ? candidates.some((candidate) => candidate === expected)
    : candidates.some((candidate) => candidate.includes(expected));
  if (!hit) return false;
  if (
    entry.titleExcludes?.some((excluded) =>
      candidates.some((candidate) => candidate.includes(normalizeTitle(excluded)))
    )
  ) {
    return false;
  }
  if (entry.year && year && year !== entry.year) return false;
  return true;
}

function posterUrl(url: string | undefined): string {
  if (!url) return '';
  return url
    .replace(/^http:/, 'https:')
    .replace('/s_ratio_poster/', '/m_ratio_poster/');
}

function formatRate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return numeric.toFixed(1);
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: DOUBAN_HEADERS,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withRetry<T>(task: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function extractSearchData(html: string): { items?: SearchSubject[] } {
  const marker = 'window.__DATA__ = ';
  const start = html.indexOf(marker);
  if (start < 0) {
    throw new Error('豆瓣搜索结果缺少数据');
  }
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(jsonStart, index + 1));
      }
    }
  }
  throw new Error('豆瓣搜索结果无法解析');
}

async function searchSubjects(query: string): Promise<
  Array<{ id: string; title: string; year: string; poster: string; rate: string }>
> {
  const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(query)}&cat=1002`;
  const html = await fetchText(url);
  const data = extractSearchData(html);
  return (data.items || [])
    .filter((item) => item && item.id && item.title && item.tpl_name !== 'search_more')
    .map((item) => ({
      id: String(item.id),
      title: item.title,
      year: yearFromTitle(item.title),
      poster: posterUrl(item.cover_url),
      rate: formatRate(item.rating?.value),
    }));
}

async function suggestSubjects(query: string): Promise<
  Array<{ id: string; title: string; year: string; poster: string; rate: string }>
> {
  const url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
  const items = await fetchDoubanData<SuggestItem[]>(url);
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.id && item.title)
    .map((item) => ({
      id: String(item.id),
      title: item.title,
      year: item.year || '',
      poster: posterUrl(item.img),
      rate: '',
    }));
}

async function lookupRate(id: string): Promise<{ rate: string; year: string }> {
  const data = await fetchDoubanData<{
    subject?: { rate?: string; release_year?: string };
  }>(`https://movie.douban.com/j/subject_abstract?subject_id=${id}`);
  return {
    rate: formatRate(data.subject?.rate),
    year: data.subject?.release_year || '',
  };
}

function pickMatch(
  candidates: Array<{ id: string; title: string; year: string; poster: string; rate: string }>,
  entry: ChildCatalogEntry
) {
  const matched = candidates.filter((candidate) =>
    matchesEntry(candidate.title, candidate.year, entry)
  );
  if (matched.length === 0) return null;
  matched.sort((a, b) => {
    const aExact = titleCandidates(a.title).some(
      (candidate) => candidate === normalizeTitle(entry.titleIncludes)
    );
    const bExact = titleCandidates(b.title).some(
      (candidate) => candidate === normalizeTitle(entry.titleIncludes)
    );
    if (aExact !== bExact) return aExact ? -1 : 1;
    const aYear = entry.year && a.year === entry.year ? 0 : 1;
    const bYear = entry.year && b.year === entry.year ? 0 : 1;
    if (aYear !== bYear) return aYear - bYear;
    return cleanTitle(a.title).length - cleanTitle(b.title).length;
  });
  return matched[0];
}

async function resolveEntry(entry: ChildCatalogEntry): Promise<ChildShelfItem | null> {
  let match: ReturnType<typeof pickMatch> = null;
  try {
    match = pickMatch(await withRetry(() => searchSubjects(entry.query)), entry);
  } catch (error) {
    console.warn(`儿童片单搜索失败: ${entry.label}`, error);
  }
  if (!match) {
    try {
      match = pickMatch(await withRetry(() => suggestSubjects(entry.query)), entry);
    } catch (error) {
      console.warn(`儿童片单建议失败: ${entry.label}`, error);
    }
  }
  if (!match || !match.poster) return null;
  const found = match;

  let rate = found.rate;
  let year = found.year;
  if (!rate) {
    try {
      const detail = await withRetry(() => lookupRate(found.id));
      rate = detail.rate || rate;
      year = year || detail.year;
    } catch (error) {
      console.warn(`儿童片单评分获取失败: ${entry.label}`, error);
    }
  }

  return {
    id: found.id,
    title: cleanTitle(found.title),
    poster: found.poster,
    rate,
    year: year || entry.year || '',
    group: entry.group,
  };
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function resolveShelf(): Promise<{ items: ChildShelfItem[]; missing: string[] }> {
  const resolved = await mapPool(CHILD_CATALOG, LOOKUP_CONCURRENCY, resolveEntry);
  const items: ChildShelfItem[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  resolved.forEach((item, index) => {
    if (!item || seen.has(item.id)) {
      missing.push(CHILD_CATALOG[index].label);
      return;
    }
    seen.add(item.id);
    items.push(item);
  });
  return { items, missing };
}

export async function getChildrenShelf(group?: string): Promise<{
  items: ChildShelfItem[];
  missing: string[];
}> {
  const fresh = shelfCache && Date.now() - shelfCache.at < CACHE_TTL_MS && shelfCache.items.length > 0;
  if (!fresh) {
    const resolved = await resolveShelf();
    if (resolved.items.length > 0) {
      shelfCache = { at: Date.now(), ...resolved };
    } else {
      return resolved;
    }
  }
  const cached = shelfCache as ShelfCache;
  const selected =
    !group || group === '全部'
      ? cached.items
      : cached.items.filter((item) => item.group === group);
  return { items: selected, missing: cached.missing };
}

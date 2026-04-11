import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.resolve('cache');

export interface CacheFile<T> {
  fetchedAt: string;
  source: string;
  data: T;
}

export async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function writeCache<T>(filename: string, source: string, data: T): Promise<void> {
  const payload: CacheFile<T> = {
    fetchedAt: new Date().toISOString(),
    source,
    data,
  };
  await fs.writeFile(path.join(CACHE_DIR, filename), JSON.stringify(payload, null, 2));
}

export async function readCache<T>(filename: string): Promise<CacheFile<T> | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, filename), 'utf-8');
    return JSON.parse(raw) as CacheFile<T>;
  } catch {
    return null;
  }
}

export function cacheExists(filename: string): Promise<boolean> {
  return fs.access(path.join(CACHE_DIR, filename)).then(() => true).catch(() => false);
}

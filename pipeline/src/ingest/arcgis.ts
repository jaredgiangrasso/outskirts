import type { FeatureCollection } from 'geojson';

const PAGE_SIZE = 1000;

interface ArcGISCountResponse {
  count: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

async function fetchPage(baseUrl: string, where: string, offset: number): Promise<FeatureCollection> {
  const url = `${baseUrl}/query?where=${encodeURIComponent(where)}&outFields=*&f=geojson&resultOffset=${offset}&resultRecordCount=${PAGE_SIZE}`;
  return fetchJson<FeatureCollection>(url);
}

async function fetchCount(baseUrl: string, where: string): Promise<number> {
  const url = `${baseUrl}/query?where=${encodeURIComponent(where)}&returnCountOnly=true&f=json`;
  const result = await fetchJson<ArcGISCountResponse>(url);
  return result.count;
}

export async function fetchArcGISLayer(layerUrl: string, where = '1=1'): Promise<FeatureCollection> {
  const total = await fetchCount(layerUrl, where);
  console.log(`  Fetching ${total} features from ${layerUrl}`);

  const allFeatures: FeatureCollection['features'] = [];
  let offset = 0;

  while (offset < total) {
    const page = await fetchPage(layerUrl, where, offset);
    allFeatures.push(...page.features);
    offset += PAGE_SIZE;
    console.log(`  ${Math.min(offset, total)}/${total} features fetched`);
  }

  return { type: 'FeatureCollection', features: allFeatures };
}

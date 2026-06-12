import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

export interface FitatuProduct {
  id: string;
  name: string;
  brand: string;
  energy_kcal_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  servingSize: string | null;
  servingQuantityG: number | null;
}

interface RawProductHeader {
  id: string;
  name: string;
}

const HEADERS = {
  'accept':          'application/json',
  'api-key':         'FITATU-MOBILE-APP',
  'api-secret':      'PYRXtfs88UDJMuCCrNpLV',
  'app-os':          'FITATU-WEB',
  'app-version':     '4.5.4',
  'x-auth-token':    '1tY95KNZFN',
  'content-type':    'application/json',
  'user-agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148',
  'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8'
};

// Temp cache file path. Vercel allows writing in /tmp.
const CACHE_PATH = path.join('/tmp', 'fitatu_products_v1.json');

// Module-scope variable for warm lambda cache
let cachedHeaders: RawProductHeader[] | null = null;

async function loadProductHeaders(): Promise<RawProductHeader[]> {
  if (cachedHeaders && cachedHeaders.length > 0) {
    return cachedHeaders;
  }

  // Try reading from file system temp cache first
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const data = fs.readFileSync(CACHE_PATH, 'utf8');
      cachedHeaders = JSON.parse(data);
      if (cachedHeaders && cachedHeaders.length > 0) {
        console.log(`Loaded ${cachedHeaders.length} product headers from /tmp cache.`);
        return cachedHeaders;
      }
    } catch (err) {
      console.warn('Failed to read /tmp cache for Fitatu products:', err);
    }
  }

  console.log('Fetching fresh product headers from Fitatu public API...');
  const res = await fetch('https://pl-pl.fitatu.com/api/public/resources/products', {
    headers: HEADERS,
  });

  if (!res.ok) {
    throw new Error(`Fitatu products list returned HTTP ${res.status}`);
  }

  const json = await res.json();
  if (Array.isArray(json)) {
    cachedHeaders = json as RawProductHeader[];
    try {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cachedHeaders), 'utf8');
      console.log(`Saved ${cachedHeaders.length} product headers to /tmp cache.`);
    } catch (err) {
      console.warn('Failed to save Fitatu products cache to file:', err);
    }
    return cachedHeaders;
  }

  throw new Error('Fitatu API returned invalid array structure');
}

async function fetchProductDetails(id: string): Promise<FitatuProduct | null> {
  try {
    const res = await fetch(`https://pl-pl.fitatu.com/api/public/resources/products/${id}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as any;
    if (!data || typeof data !== 'object') return null;

    let servingSize: string | null = null;
    let servingQuantityG: number | null = null;

    if (Array.isArray(data.measures)) {
      // Find the first measure that is not just 'g' or 'ml'
      const customMeasure = data.measures.find(
        (m: any) => m && m.name && m.name.toLowerCase() !== 'g' && m.name.toLowerCase() !== 'ml' && m.weightPerUnit > 0
      );
      if (customMeasure) {
        servingSize = `1 ${customMeasure.name} (${customMeasure.weightPerUnit}g)`;
        servingQuantityG = customMeasure.weightPerUnit;
      }
    }

    return {
      id: `fitatu-${id}`,
      name: data.name || '',
      brand: data.brand || data.manufacturer || 'Fitatu',
      energy_kcal_100g: Number(data.energy) || 0,
      proteins_100g: Number(data.protein) || 0,
      carbohydrates_100g: Number(data.carbohydrate) || 0,
      fat_100g: Number(data.fat) || 0,
      servingSize,
      servingQuantityG,
    };
  } catch (err) {
    console.error(`Failed to fetch details for Fitatu product ${id}:`, err);
    return null;
  }
}

export async function scrapeFitatu(searchTerm: string): Promise<FitatuProduct[]> {
  try {
    const headers = await loadProductHeaders();
    const queryLower = searchTerm.toLowerCase().trim();
    const keywords = queryLower.split(/\s+/).filter(Boolean);

    if (keywords.length === 0) return [];

    // Filter by containing all keywords
    const matches = headers.filter(p => {
      if (!p || !p.name) return false;
      const nameLower = p.name.toLowerCase();
      return keywords.every(kw => nameLower.includes(kw));
    });

    // Rank matching results
    matches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exact matches first
      const aExact = aName === queryLower;
      const bExact = bName === queryLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Matches starting at string start next
      const aStart = aName.startsWith(queryLower);
      const bStart = bName.startsWith(queryLower);
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;

      // Shorter names next
      return aName.length - bName.length;
    });

    // Limit to top 15 matches to resolve details quickly in parallel
    const topMatches = matches.slice(0, 15);

    const detailsPromises = topMatches.map(m => fetchProductDetails(m.id));
    const results = await Promise.all(detailsPromises);

    return results.filter((p): p is FitatuProduct => p !== null);
  } catch (err) {
    console.error('Fitatu search failed:', err);
    return [];
  }
}

// Vercel serverless function entrypoint
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Retrieve SearchTerm from query or request body
  const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  let searchTerm = urlObj.searchParams.get('SearchTerm') || urlObj.searchParams.get('q') || '';

  if (!searchTerm && req.method === 'POST') {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(Buffer.from(chunk));
    }
    const bodyText = Buffer.concat(buffers).toString();
    try {
      const body = JSON.parse(bodyText);
      searchTerm = body.SearchTerm || body.q || '';
    } catch {
      const params = new URLSearchParams(bodyText);
      searchTerm = params.get('SearchTerm') || params.get('q') || '';
    }
  }

  if (!searchTerm) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'SearchTerm is required' }));
    return;
  }

  const products = await scrapeFitatu(searchTerm);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(products));
}

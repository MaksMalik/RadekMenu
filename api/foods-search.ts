import type { IncomingMessage, ServerResponse } from 'http';

export interface ScrapedProduct {
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

export async function scrapeFatSecret(searchTerm: string): Promise<ScrapedProduct[]> {
  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // 1. Fetch the demo page to get cookies and anti-forgery token
    const res = await fetch("https://platform.fatsecret.com/api-demo", {
      headers: { "user-agent": userAgent }
    });
    
    if (!res.ok) {
      console.warn("FatSecret demo page fetch failed with status", res.status);
      return [];
    }

    const html = await res.text();
    const antiForgeryMatch = html.match(/name="FatSecret.AntiForgery"\s+type="hidden"\s+value="([^"]+)"/);
    if (!antiForgeryMatch) {
      console.warn("FatSecret AntiForgery token not found in HTML");
      return [];
    }
    const token = antiForgeryMatch[1];

    const cookies = res.headers.getSetCookie();
    if (!cookies || cookies.length === 0) {
      console.warn("No cookies returned from FatSecret demo page");
      return [];
    }
    const cookieString = cookies.map(c => c.split(';')[0]).join('; ');

    // 2. Perform POST request for search
    const searchRes = await fetch("https://platform.fatsecret.com/api-demo/foods-search", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "pragma": "no-cache",
        "cookie": cookieString,
        "x-requested-with": "XMLHttpRequest",
        "user-agent": userAgent,
        "origin": "https://platform.fatsecret.com",
        "referer": "https://platform.fatsecret.com/api-demo"
      },
      body: `MarketLocale=PL&LanguageLocale=pl&SearchTerm=${encodeURIComponent(searchTerm)}&Token=&FatSecret.AntiForgery=${encodeURIComponent(token)}`
    });

    if (!searchRes.ok) {
      console.warn("FatSecret search request failed with status", searchRes.status);
      return [];
    }

    const resultHtml = await searchRes.text();

    if (resultHtml.includes("exceeded our request allowance") || resultHtml.includes("try again in 5 minutes")) {
      console.warn("FatSecret search request rate-limited/allowance exceeded");
      return [];
    }

    // 3. Parse HTML and extract products
    const formRegex = /<form[^>]*action="\/api-demo\/foods-get\?foodId=(\d+)"[^>]*>([\s\S]*?)<\/form>/gi;
    const products: ScrapedProduct[] = [];
    let match;

    while ((match = formRegex.exec(resultHtml)) !== null) {
      const foodId = match[1];
      const formContent = match[2];

      const nameMatch = formContent.match(/<div class="food-name">([\s\S]*?)(?:&emsp;|<span|\/div>)/i);
      let name = nameMatch ? nameMatch[1].trim() : '';
      name = name.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      const brandMatch = formContent.match(/<span class="fw-normal">\s*\(([^)]+)\)\s*<\/span>/i);
      const brand = brandMatch ? brandMatch[1].trim() : '';

      const descMatch = formContent.match(/<div class="food-description[^>]*>([\s\S]*?)<\/div>/i);
      let desc = descMatch ? descMatch[1].trim() : '';
      desc = desc.replace(/&#x9;/g, '').replace(/\s+/g, ' ');

      const portionMatch = desc.match(/na\s+([^-]+)-\s+Kalorie/i);
      const portion = portionMatch ? portionMatch[1].trim() : '';

      const kcalMatch = desc.match(/Kalorie:\s*([\d.,]+)\s*kcal/i);
      const kcal = kcalMatch ? parseFloat(kcalMatch[1].replace(',', '.')) : 0;

      const fatMatch = desc.match(/Tłusz:\s*([\d.,]+)\s*g/i);
      const fat = fatMatch ? parseFloat(fatMatch[1].replace(',', '.')) : 0;

      const carbsMatch = desc.match(/Węglo:\s*([\d.,]+)\s*g/i);
      const carbs = carbsMatch ? parseFloat(carbsMatch[1].replace(',', '.')) : 0;

      const proteinMatch = desc.match(/Białk:\s*([\d.,]+)\s*g/i);
      const protein = proteinMatch ? parseFloat(proteinMatch[1].replace(',', '.')) : 0;

      // Extract serving quantity
      const weightMatch = portion.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)/i);
      let weight = 100;
      let servingQuantityG: number | null = null;
      const servingSize: string | null = portion || null;

      if (weightMatch) {
        weight = parseFloat(weightMatch[1].replace(',', '.'));
        servingQuantityG = weight;
      } else {
        const numMatch = portion.match(/(\d+(?:[.,]\d+)?)/);
        if (numMatch) {
          weight = parseFloat(numMatch[1].replace(',', '.'));
          servingQuantityG = weight;
        }
      }

      if (weight <= 0) weight = 100;
      const factor = 100 / weight;

      products.push({
        id: `fatsecret-${foodId}`,
        name: name,
        brand: brand || 'FatSecret',
        energy_kcal_100g: Math.round(kcal * factor * 10) / 10,
        proteins_100g: Math.round(protein * factor * 10) / 10,
        carbohydrates_100g: Math.round(carbs * factor * 10) / 10,
        fat_100g: Math.round(fat * factor * 10) / 10,
        servingSize,
        servingQuantityG,
      });
    }

    return products;
  } catch (error) {
    console.error("FatSecret scraping error:", error);
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
    // Read body if POST
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(Buffer.from(chunk));
    }
    const bodyText = Buffer.concat(buffers).toString();
    try {
      const body = JSON.parse(bodyText);
      searchTerm = body.SearchTerm || body.q || '';
    } catch {
      // Check as urlencoded
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

  const products = await scrapeFatSecret(searchTerm);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(products));
}

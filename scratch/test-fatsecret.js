async function run() {
  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    console.log("Fetching demo page...");
    const res = await fetch("https://platform.fatsecret.com/api-demo", {
      headers: {
        "user-agent": userAgent
      }
    });
    const html = await res.text();

    const antiForgeryMatch = html.match(/name="FatSecret.AntiForgery"\s+type="hidden"\s+value="([^"]+)"/);
    if (!antiForgeryMatch) {
      console.error("Anti-forgery token not found in HTML!");
      return;
    }
    const token = antiForgeryMatch[1];

    // Get cookies
    const cookies = res.headers.getSetCookie();
    const cookieString = cookies.map(c => c.split(';')[0]).join('; ');

    console.log("Performing search...");
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
      body: `MarketLocale=PL&LanguageLocale=pl&SearchTerm=jab%C5%82ko&Token=&FatSecret.AntiForgery=${encodeURIComponent(token)}`
    });

    console.log("Search status:", searchRes.status);
    console.log("Search response headers:", [...searchRes.headers.entries()]);
    const resultHtml = await searchRes.text();
    console.log("Search response body length:", resultHtml.length);
    console.log("Search response body:", resultHtml.substring(0, 1000));
  } catch (err) {
    console.error("Error during search test:", err);
  }
}

run();

const sampleHtml = `
<div class="food-search-result content row 0810cbc211554b8684737745fb7ef5f3">
    <div class="col-12 col-md-6">
        <div class="row">
            <div class="search-results">
                <form class="text-decoration-none link-group" action="/api-demo/foods-get?foodId=8556967" method="post">
                    <div class="food-name">
                        Hot Dog
&emsp;
                        <span class="fw-normal">(Żabka)</span>
                    </div>
                    <div class="food-description pb-1">
                        na 1 hot dog (155g) - Kalorie: 436kcal | Tłusz: 25.10g | Węglo: 42.00g | Białk: 12.20g
                    </div>
                </form>
                <form class="text-decoration-none link-group" action="/api-demo/foods-get?foodId=80311869" method="post">
                    <div class="food-name">
                        Kawa Z Mlekiem
&emsp;
                        <span class="fw-normal">(Żabka)</span>
                    </div>
                    <div class="food-description pb-1">
                        na &#x9;1 porcja (400ml) - Kalorie: 122kcal | Tłusz: 6.40g | Węglo: 9.40g | Białk: 6.80g
                    </div>
                </form>
                <form class="text-decoration-none link-group" action="/api-demo/foods-get?foodId=95972402" method="post">
                    <div class="food-name">
                        Kajzerka
&emsp;
                        <span class="fw-normal">(Żabka)</span>
                    </div>
                    <div class="food-description pb-1">
                        na 100g - Kalorie: 253kcal | Tłusz: 2.10g | Węglo: 50.00g | Białk: 7.60g
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
`;

function parseFatSecretHtml(html) {
  const formRegex = /<form[^>]*action="\/api-demo\/foods-get\?foodId=(\d+)"[^>]*>([\s\S]*?)<\/form>/gi;
  const products = [];
  let match;

  while ((match = formRegex.exec(html)) !== null) {
    const foodId = match[1];
    const formContent = match[2];

    const nameMatch = formContent.match(/<div class="food-name">([\s\S]*?)(?:&emsp;|<span|\/div>)/i);
    let name = nameMatch ? nameMatch[1].trim() : '';

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

    products.push({
      id: foodId,
      name,
      brand,
      description: desc,
      portion,
      kcal,
      fat,
      carbs,
      protein
    });
  }

  return products;
}

const parsed = parseFatSecretHtml(sampleHtml);
console.log("Parsed products:", JSON.stringify(parsed, null, 2));

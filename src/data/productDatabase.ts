import type { OFFProduct } from '../types/openfoodfacts';

interface LocalProduct extends OFFProduct {
  keywords: string[];
}

function product(
  id: string,
  name: string,
  kcal: number,
  protein: number,
  carbs: number,
  fats: number,
  keywords: string[] = [],
  servingQuantityG: number | null = null
): LocalProduct {
  return {
    id: `local-${id}`,
    name,
    brand: 'Baza Smakołysz',
    energy_kcal_100g: kcal,
    proteins_100g: protein,
    carbohydrates_100g: carbs,
    fat_100g: fats,
    servingSize: servingQuantityG ? `${servingQuantityG}g` : null,
    servingQuantityG,
    keywords,
  };
}

export const LOCAL_PRODUCT_DATABASE: LocalProduct[] = [
  product('chicken-breast', 'Pierś z kurczaka surowa', 110, 23, 0, 1.5, ['kurczak', 'filet', 'drob']),
  product('chicken-ham', 'Szynka z kurczaka', 105, 18, 2, 2.5, ['szynka', 'wedlina', 'kanapka']),
  product('turkey-breast', 'Filet z indyka surowy', 104, 22, 0, 1.2, ['indyk', 'filet', 'drob']),
  product('lean-beef', 'Wołowina mielona 5%', 137, 21, 0, 5, ['wolowina', 'mielone', 'burger']),
  product('pork-loin', 'Schab wieprzowy surowy', 143, 21, 0, 5.5, ['schab', 'wieprzowina']),
  product('salmon', 'Łosoś surowy', 208, 20, 0, 13, ['losos', 'ryba']),
  product('tuna-water', 'Tuńczyk w sosie własnym', 116, 26, 0, 1, ['tunczyk', 'ryba', 'puszka']),
  product('egg', 'Jajko całe', 143, 12.6, 0.7, 9.5, ['jajka', 'jajo'], 60),
  product('egg-white', 'Białka jaj', 52, 11, 0.7, 0.2, ['białko jaj', 'bialko jaj']),

  product('skyr-natural', 'Skyr naturalny', 62, 11, 4, 0.2, ['skyr', 'jogurt proteinowy'], 150),
  product('greek-yogurt', 'Jogurt grecki 2%', 73, 9, 3.6, 2, ['jogurt']),
  product('protein-pudding', 'Pudding proteinowy waniliowy', 76, 10, 6, 1.5, ['pudding', 'budyn proteinowy'], 200),
  product('cottage-cheese', 'Serek wiejski lekki', 81, 11, 2.5, 3, ['cottage', 'serek']),
  product('twarog', 'Twaróg półtłusty', 133, 18.7, 3.7, 4.7, ['twarog', 'ser bialy']),
  product('milk-2', 'Mleko 2%', 50, 3.4, 4.9, 2, ['mleko']),
  product('yellow-cheese', 'Ser żółty gouda', 356, 25, 2.2, 27, ['ser zolty', 'gouda']),
  product('mozzarella-light', 'Mozzarella light', 165, 20, 1.5, 8.5, ['mozzarella', 'ser']),
  product('cream-cheese', 'Serek kremowy lekki', 160, 8, 5, 11, ['philadelphia', 'serek kanapkowy']),

  product('potatoes', 'Ziemniaki surowe', 77, 2, 17, 0.1, ['kartofle']),
  product('sweet-potatoes', 'Bataty surowe', 86, 1.6, 20, 0.1, ['slodkie ziemniaki']),
  product('rice-white', 'Ryż biały suchy', 360, 7, 79, 0.7, ['ryz']),
  product('pasta-wheat', 'Makaron pszenny suchy', 350, 12, 72, 1.5, ['makaron']),
  product('oats', 'Płatki owsiane', 366, 13, 60, 7, ['owsianka', 'platki']),
  product('wheat-wrap', 'Wrap pszenny', 310, 8.5, 52, 7, ['tortilla', 'wrapy'], 62),
  product('wholegrain-wrap', 'Tortilla pełnoziarnista', 300, 9, 48, 7.5, ['wrap', 'tortilla']),
  product('toast-bread', 'Chleb tostowy pszenny', 265, 8.5, 49, 3.5, ['tost', 'pieczywo'], 25),
  product('kaiser-roll', 'Kajzerka', 285, 8.5, 57, 2.5, ['bulka', 'kajzerki'], 60),
  product('graham-roll', 'Bułka grahamka', 260, 9, 50, 3, ['bulka', 'graham']),
  product('granola', 'Granola klasyczna', 450, 10, 62, 17, ['musli']),

  product('banana', 'Banan', 89, 1.1, 23, 0.3, ['banany'], 120),
  product('apple', 'Jabłko', 52, 0.3, 14, 0.2, ['jablko', 'jabłka'], 180),
  product('pear', 'Gruszka', 57, 0.4, 15, 0.1, ['gruszki'], 170),
  product('kiwi', 'Kiwi', 61, 1.1, 15, 0.5, ['owoc'], 75),
  product('strawberries', 'Truskawki', 32, 0.7, 7.7, 0.3, ['truskawka']),
  product('blueberries', 'Borówki', 57, 0.7, 14.5, 0.3, ['borowki']),
  product('raspberries', 'Maliny', 52, 1.2, 12, 0.7, ['malina']),

  product('cucumber', 'Ogórek zielony', 15, 0.7, 3.6, 0.1, ['ogorek']),
  product('pickles', 'Ogórek kiszony', 12, 0.6, 2.3, 0.2, ['ogorek kiszony']),
  product('tomato', 'Pomidor', 18, 0.9, 3.9, 0.2, ['pomidory']),
  product('pepper', 'Papryka czerwona', 31, 1, 6, 0.3, ['papryka']),
  product('onion', 'Cebula', 40, 1.1, 9.3, 0.1, ['cebula']),
  product('carrot', 'Marchew', 41, 0.9, 10, 0.2, ['marchewka']),
  product('broccoli', 'Brokuły', 34, 2.8, 7, 0.4, ['brokul']),
  product('spinach', 'Szpinak', 23, 2.9, 3.6, 0.4, ['szpinak']),
  product('corn', 'Kukurydza konserwowa', 96, 3.4, 18.7, 1.5, ['kukurydza']),

  product('olive-oil', 'Oliwa z oliwek', 884, 0, 0, 100, ['oliwa', 'olej'], 10),
  product('butter', 'Masło', 717, 0.9, 0.1, 81, ['maslo']),
  product('light-mayo', 'Majonez lekki', 300, 1, 6, 30, ['majonez']),
  product('ketchup', 'Ketchup', 100, 1.5, 23, 0.2, ['sos']),
  product('peanut-butter', 'Masło orzechowe', 588, 25, 20, 50, ['maslo orzechowe', 'orzechy']),
  product('salted-peanuts', 'Orzeszki ziemne solone', 585, 25, 16, 49, ['orzeszki', 'fistaszki']),
  product('avocado', 'Awokado', 160, 2, 9, 15, ['awokado']),

  product('jam', 'Dżem truskawkowy', 250, 0.4, 62, 0.2, ['dzem', 'konfitura']),
  product('popcorn', 'Popcorn solony gotowy', 430, 9, 58, 16, ['popcorn']),
  product('chips', 'Chipsy ziemniaczane', 536, 6, 53, 34, ['chipsy']),
  product('corn-puffs', 'Chrupki kukurydziane', 390, 7, 78, 4, ['chrupki']),
  product('dark-chocolate', 'Czekolada gorzka', 546, 7.8, 45, 35, ['czekolada']),
  product('whey', 'Odżywka białkowa WPC', 390, 78, 8, 6, ['bialko', 'wpc', 'protein'], 30),
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreProduct(productItem: LocalProduct, query: string): number {
  const haystack = normalize(
    `${productItem.name} ${productItem.brand} ${productItem.keywords.join(' ')}`
  );
  const normalizedQuery = normalize(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  if (tokens.length === 0) return 0;

  let score = haystack.includes(normalizedQuery) ? 8 : 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += token.length >= 4 ? 3 : 1;
    }
  }

  return tokens.every(token => haystack.includes(token)) ? score : 0;
}

export function searchLocalProducts(query: string, limit = 20): OFFProduct[] {
  return LOCAL_PRODUCT_DATABASE
    .map(productItem => ({ productItem, score: scoreProduct(productItem, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.productItem.name.localeCompare(b.productItem.name, 'pl'))
    .slice(0, limit)
    .map(({ productItem }) => {
      const { keywords: _keywords, ...offProduct } = productItem;
      void _keywords;
      return offProduct;
    });
}

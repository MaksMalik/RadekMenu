import type { AppState, DayPlan, Meal, MealType, UserProfile } from '../types';
import { todayISO } from '../utils/dateUtils';

const defaultUserProfile: UserProfile = {
  weight: 76,
  height: 178,
  goal: 'recomposition',
  dailyCalorieTarget: 2200,
  dailyProteinTarget: 150,
  macroPercentages: { protein: 27, carbs: 43, fats: 30 },
  mealsPerDay: 5,
  equipment: ['Airfryer', 'Opiekacz/Toster'],
  dislikedIngredients: [
    'ryż', 'kasza', 'rzodkiewki', 'kalafior', 'brokuły',
    'szpinak', 'marchewki', 'zwykły chleb', 'sałatka ziemniaczana',
  ],
  preferredIngredients: [
    'ziemniaki', 'kurczak', 'indyk', 'wołowina', 'wieprzowina',
    'makaron', 'wrapy', 'chleb tostowy pszenny', 'kajzerki',
    'dżemy', 'skyry', 'puddingi proteinowe',
    'jogurty pitne bez kawałków owoców', 'jajka', 'sery',
    'szynka z kurczaka', 'ogórki kiszone/zielone', 'banany',
    'jabłka', 'gruszki', 'kiwi', 'truskawki', 'borówki', 'maliny',
    'popcorn', 'orzeszki solone', 'chipsy/chrupki',
  ],
  vegetableRule: 'Nie generuj samych pomidorów ani samej papryki jako wolnostojących. Mogą występować WYŁĄCZNIE ukryte wewnątrz potraw.',
};

function createSeedMeal(
  id: string,
  type: MealType,
  title: string,
  kcal: number,
  protein: number,
  carbs: number,
  fats: number,
  ingredients: string[],
  instruction: string,
  tip?: string
): Meal {
  return { id, type, title, kcal, protein, carbs, fats, ingredients, instruction, tip, eaten: false };
}

const seedMeals: Meal[] = [
  createSeedMeal(
    'seed-meal-1',
    'Śniadanie',
    'Chrupiące kajzerki z szynką, serem i lekkim majonezem',
    570, 30, 55, 25,
    ['kajzerki (2 szt.)', 'szynka z kurczaka (80g)', 'ser żółty (40g)', 'majonez lekki (15g)', 'masło (10g)'],
    'Kajzerki przekrój na pół, posmaruj masłem. Ułóż szynkę i ser, dodaj odrobinę majonezu. Podawaj na zimno lub podgrzej w tosterze 2 min.',
    'Możesz dodać ogórka kiszonego dla kontrastu smakowego.'
  ),
  createSeedMeal(
    'seed-meal-2',
    'II Śniadanie',
    'Białkowy skyr z dżemem truskawkowym i bananem',
    295, 25, 45, 3,
    ['skyr naturalny (200g)', 'dżem truskawkowy (30g)', 'banan (1 szt.)'],
    'Wyłóż skyr do miseczki, polej dżemem truskawkowym. Pokrój banana w plastry i ułóż na wierzchu.',
  ),
  createSeedMeal(
    'seed-meal-3',
    'Obiad',
    'Złociste ziemniaczki z Airfryera z soczystym kurczakiem',
    480, 38, 50, 12,
    ['ziemniaki (250g)', 'filet z kurczaka (150g)', 'oliwa z oliwek (5ml)', 'przyprawy (papryka, czosnek, sól, pieprz)'],
    'Ziemniaki pokrój w ćwiartki, skrop oliwą i przypraw. Airfryer 200°C, 20 min. Kurczaka przypraw, Airfryer 180°C, 15 min. Podawaj razem.',
    'Ziemniaki wyjdą bardziej chrupiące jeśli namoczyć je wcześniej w wodzie na 15 min i osuszyć.'
  ),
  createSeedMeal(
    'seed-meal-4',
    'Przekąska',
    'Pudding proteinowy z malinami i orzeszkami',
    290, 23, 28, 10,
    ['pudding proteinowy (150g)', 'maliny (80g)', 'orzeszki solone (15g)'],
    'Wyłóż pudding do miseczki. Posyp malinami i pokruszonymi orzeszkami.',
  ),
  createSeedMeal(
    'seed-meal-5',
    'Kolacja',
    'Zapieczony wrap z indykiem i kremowym serkiem',
    515, 38, 40, 22,
    ['wrap pszenny (2 szt.)', 'filet z indyka (120g)', 'serek kremowy (50g)', 'ser żółty tarty (30g)', 'ogórek kiszony (1 szt.)'],
    'Indyka pokrój w paski i podsmaż na patelni. Wrap posmaruj serkiem, ułóż indyka i pokrojonego ogórka. Zawiń, posyp tartym serem. Zapiekaj w Airfryer 180°C, 5 min.',
  ),
];

export function getDefaultState(): AppState {
  const today = todayISO();
  const seedDay: DayPlan = { date: today, meals: seedMeals };
  return {
    userProfile: defaultUserProfile,
    dayPlans: [seedDay],
    selectedDate: today,
    clipboard: null,
    historyStack: [],
    geminiApiKey: '',
    schemaVersion: 2,
  };
}

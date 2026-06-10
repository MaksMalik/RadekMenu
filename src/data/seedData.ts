import type { AppState, DayPlan, Meal, MealType, UserProfile, WorkoutDay, StepCount } from '../types';

// ─── Default User Profile ────────────────────────────────────────────────────

const defaultUserProfile: UserProfile = {
  weight: 76,
  height: 178,
  goal: 'recomposition',
  dailyCalorieTarget: 2200,
  dailyProteinTarget: 150,
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

// ─── Day 1 Seed Meals ────────────────────────────────────────────────────────

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

const day1Meals: Meal[] = [
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

// ─── Workout Plan (4-day Upper/Lower split) ──────────────────────────────────

const workoutPlan: WorkoutDay[] = [
  {
    id: 'gora-a',
    name: 'Góra A',
    exercises: [
      { name: 'Podciąganie na drążku (nachwytem)', sets: 4, reps: '6-10', equipment: 'drążek do podciągania' },
      { name: 'Wiosłowanie hantlami w opadzie', sets: 4, reps: '8-12', equipment: 'hantle regulowane' },
      { name: 'Wyciskanie hantli nad głowę', sets: 3, reps: '8-12', equipment: 'hantle regulowane' },
      { name: 'Uginanie ramion z hantlami', sets: 3, reps: '10-12', equipment: 'hantle regulowane' },
      { name: 'Wznosy bokiem', sets: 3, reps: '12-15', equipment: 'hantle regulowane' },
    ],
  },
  {
    id: 'dol-a',
    name: 'Dół A',
    exercises: [
      { name: 'Goblet squat z hantlem', sets: 4, reps: '8-12', equipment: 'hantle regulowane' },
      { name: 'Wykroki bułgarskie', sets: 3, reps: '10-12 na nogę', equipment: 'hantle regulowane' },
      { name: 'Martwy ciąg rumuński z hantlami', sets: 4, reps: '8-12', equipment: 'hantle regulowane' },
      { name: 'Wspięcia na palce z hantlami', sets: 3, reps: '15-20', equipment: 'hantle regulowane' },
      { name: 'Plank', sets: 3, reps: '45-60s', equipment: 'brak (masa ciała)' },
    ],
  },
  {
    id: 'gora-b',
    name: 'Góra B',
    exercises: [
      { name: 'Podciąganie na drążku (podchwytem)', sets: 4, reps: '6-10', equipment: 'drążek do podciągania' },
      { name: 'Wyciskanie hantli na ławce płaskiej', sets: 4, reps: '8-12', equipment: 'hantle regulowane' },
      { name: 'Rozpiętki z hantlami', sets: 3, reps: '10-12', equipment: 'hantle regulowane' },
      { name: 'Prostowanie ramion z hantlem (francuskie)', sets: 3, reps: '10-12', equipment: 'hantle regulowane' },
      { name: 'Face pull z gumą / wznosy tyłem', sets: 3, reps: '12-15', equipment: 'hantle regulowane' },
    ],
  },
  {
    id: 'dol-b',
    name: 'Dół B',
    exercises: [
      { name: 'Przysiad z hantlami (front squat)', sets: 4, reps: '8-12', equipment: 'hantle regulowane' },
      { name: 'Hip thrust z hantlem', sets: 4, reps: '10-15', equipment: 'hantle regulowane' },
      { name: 'Wykroki do tyłu z hantlami', sets: 3, reps: '10-12 na nogę', equipment: 'hantle regulowane' },
      { name: 'Wspięcia na palce (jednonóż)', sets: 3, reps: '12-15 na nogę', equipment: 'brak (masa ciała)' },
      { name: 'Deska boczna', sets: 3, reps: '30-45s na stronę', equipment: 'brak (masa ciała)' },
    ],
  },
];

// ─── Helper: Create 14-day empty plan with Day 1 seeded ──────────────────────

function createDayPlans(): DayPlan[] {
  const plans: DayPlan[] = [];
  for (let day = 1; day <= 14; day++) {
    plans.push({
      day,
      meals: day === 1 ? day1Meals : [],
    });
  }
  return plans;
}

// ─── Helper: Create initial step counts ──────────────────────────────────────

function createStepCounts(): StepCount[] {
  return Array.from({ length: 14 }, (_, i) => ({ day: i + 1, count: 0, target: 12000 }));
}

// ─── Export: getDefaultState ─────────────────────────────────────────────────

export function getDefaultState(): AppState {
  return {
    userProfile: defaultUserProfile,
    dayPlans: createDayPlans(),
    workoutPlan,
    stepCounts: createStepCounts(),
    selectedDay: 1,
    clipboard: null,
    historyStack: [],
    geminiApiKey: '',
    schemaVersion: 1,
  };
}

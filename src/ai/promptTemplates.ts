import type { Meal, MealType, UserProfile, DayPlan } from '../types';
import { macroTargetsFromProfile } from '../utils/macroTargets';

/**
 * Shared instruction enforcing a consistent ingredient format so the shopping
 * list can correctly aggregate quantities across meals/days.
 */
const INGREDIENT_FORMAT_RULE =
  'FORMAT SKŁADNIKÓW (obowiązkowy): każdy składnik podaj jako "nazwa (ilość jednostka)", gdzie ilość to liczba, a jednostka to g, ml lub szt. Przykłady: "banan (1 szt.)", "ryż (200g)", "mleko (50ml)", "chleb tostowy (2 szt.)". Używaj jednolitych, prostych nazw (bez ilości w samej nazwie), aby tę samą rzecz dało się zsumować między posiłkami. Nie łącz kilku produktów w jeden składnik (wyjątek: przyprawy).';

export function buildSwapPrompt(
  meal: Meal,
  profile: UserProfile,
  comment?: string,
  sameDayTitles?: string[]
): string {
  const targetKcalMin = Math.round(meal.kcal * 0.95);
  const targetKcalMax = Math.round(meal.kcal * 1.05);

  const targetProteinMin = Math.round(meal.protein * 0.95);
  const targetProteinMax = Math.round(meal.protein * 1.05);
  const targetCarbsMin = Math.round(meal.carbs * 0.95);
  const targetCarbsMax = Math.round(meal.carbs * 1.05);
  const targetFatsMin = Math.round(meal.fats * 0.95);
  const targetFatsMax = Math.round(meal.fats * 1.05);

  const dislikesSection = profile.dislikedIngredients.length > 0
    ? `\n\nBEZWZGLĘDNIE ZAKAZANE składniki (NIGDY nie używaj):\n${profile.dislikedIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const equipmentSection = profile.equipment.length > 0
    ? `\n\nDostępny sprzęt kuchenny:\n${profile.equipment.map(e => `- ${e}`).join('\n')}`
    : '';

  const preferredSection = profile.preferredIngredients.length > 0
    ? `\n\nLubiane składniki użytkownika (waga sugestii: 1%). To jest bardzo luźna inspiracja, NIE lista składników do użycia. Posiłek ma być sensowny kulinarnie nawet wtedy, gdy nie użyjesz żadnej rzeczy z tej listy. Nie łącz losowo kilku lubianych składników tylko dlatego, że są lubiane:\n${profile.preferredIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const vegetableRuleSection = profile.vegetableRule
    ? `\n\nZasada dotycząca warzyw: ${profile.vegetableRule}`
    : '';

  const commentSection = comment
    ? `\n\nDodatkowe uwagi użytkownika: ${comment}`
    : '';

  const otherSameDay = (sameDayTitles ?? []).filter(t => t && t !== meal.title);
  const sameDaySection = otherSameDay.length > 0
    ? `\n\nINNE posiłki zaplanowane na ten sam dzień (NIE proponuj dania, które się z nimi pokrywa lub powtarza — zadbaj o różnorodność dnia):\n${otherSameDay.map(t => `- ${t}`).join('\n')}`
    : '';

  const culinarySenseSection = `\n\nSENS KULINARNY (obowiązkowe): wygeneruj normalny, jadalny posiłek, który mógłby realnie trafić do jadłospisu. Każde danie ma mieć spójną rolę składników: baza węglowodanowa / źródło białka / dodatki / sos lub przyprawy. Zakazane są przypadkowe zlepki przekąsek z mięsem lub wędliną, np. "popcorn z szynką", "chipsy z indykiem", "dżem z mięsem". Jeśli używasz przekąski typu popcorn/chipsy/orzeszki, traktuj ją jako samodzielną przekąskę albo mały dodatek, nie jako bazę obiadu/kolacji.`;

  // When the user leaves a comment we treat this as a targeted MODIFICATION of
  // the existing dish (keep everything, change only what they ask). Without a
  // comment we propose a different but macro-equivalent alternative.
  const taskSection = comment
    ? `Zadanie: Użytkownik chce ZMODYFIKOWAĆ poniższy, KONKRETNY posiłek zgodnie ze swoim komentarzem. To NIE jest budowanie nowego dania od zera — masz ZACHOWAĆ oryginalny posiłek (tę samą bazę, te same pozostałe składniki i sposób przygotowania) i zmienić TYLKO to, o co prosi użytkownik w komentarzu. Przykład: jeśli danie to "kurczak z frytkami" a użytkownik pisze "zamień frytki na coś innego", zostaw kurczaka i całą resztę bez zmian, podmień jedynie frytki. Resztę składników i instrukcji przepisz praktycznie 1:1 (możesz tylko delikatnie skorygować ilości, by utrzymać kalorie i makro).`
    : `Zadanie: Wymień poniższy posiłek na INNĄ alternatywę o ZBLIŻONYCH makroskładnikach.`;

  return `Jesteś polskim asystentem dietetycznym specjalizującym się w planowaniu posiłków dla rekompozycji sylwetki.

${taskSection}

PEŁNE dane oryginalnego posiłku (masz komplet informacji — składniki ORAZ sposób przygotowania; korzystaj z nich i NIE wymyślaj wszystkiego od nowa):
${JSON.stringify(meal, null, 2)}

KRYTYCZNIE WAŻNE — TWARDY LIMIT KALORII: wynik MUSI mieścić się w przedziale ${targetKcalMin}–${targetKcalMax} kcal (czyli ${meal.kcal} kcal ±5%). To jest BEZWZGLĘDNY wymóg — NIE WOLNO go przekroczyć ani zejść poniżej. Zanim podasz odpowiedź, sam policz kalorie składników i upewnij się, że suma mieści się w tym przedziale. Jeśli wychodzi poza zakres, popraw porcje/składniki aż się zmieści.

Docelowe makroskładniki:
- Kalorie: ${targetKcalMin}–${targetKcalMax} kcal (TWARDY LIMIT — obowiązkowy)
- Białko: ${targetProteinMin}–${targetProteinMax} g
- Węglowodany: ${targetCarbsMin}–${targetCarbsMax} g
- Tłuszcze: ${targetFatsMin}–${targetFatsMax} g${dislikesSection}${equipmentSection}${preferredSection}${vegetableRuleSection}${commentSection}${sameDaySection}${culinarySenseSection}

${INGREDIENT_FORMAT_RULE}

Odpowiedz WYŁĄCZNIE poprawnym obiektem JSON (bez bloków markdown, bez dodatkowego tekstu) w następującym formacie:
{
  "id": "unikalne-id",
  "type": "${meal.type}",
  "title": "Nazwa posiłku",
  "kcal": liczba,
  "protein": liczba,
  "carbs": liczba,
  "fats": liczba,
  "ingredients": ["nazwa (ilość jednostka)", "..."],
  "instruction": "Instrukcja przygotowania",
  "tip": "Opcjonalna wskazówka smaku",
  "eaten": false
}`;
}

const MEAL_ORDER: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

export function buildFullDayPrompt(
  profile: UserProfile,
  otherDays?: DayPlan[],
  existingMeals?: Meal[]
): string {
  const kept = existingMeals ?? [];
  const keptKcal = kept.reduce((s, m) => s + m.kcal, 0);
  const keptProtein = kept.reduce((s, m) => s + m.protein, 0);
  const keptCarbs = kept.reduce((s, m) => s + m.carbs, 0);
  const keptFats = kept.reduce((s, m) => s + m.fats, 0);
  const dailyTargets = macroTargetsFromProfile(profile);

  // Remaining targets after accounting for meals already on the day
  const remKcal = Math.max(dailyTargets.kcal - keptKcal, 0);
  const remProtein = Math.max(dailyTargets.protein - keptProtein, 0);
  const remCarbs = Math.max(dailyTargets.carbs - keptCarbs, 0);
  const remFats = Math.max(dailyTargets.fats - keptFats, 0);

  const targetKcalMin = Math.round(remKcal * 0.98);
  const targetKcalMax = Math.round(remKcal * 1.02);
  const targetProteinMin = Math.max(remProtein - 8, 0);
  const targetProteinMax = remProtein + 8;
  const targetCarbsMin = Math.max(remCarbs - 10, 0);
  const targetCarbsMax = remCarbs + 10;
  const targetFatsMin = Math.max(remFats - 6, 0);
  const targetFatsMax = remFats + 6;

  // Which meal types are still missing
  const presentTypes = new Set(kept.map(m => m.type));
  const missingTypes = MEAL_ORDER.filter(t => !presentTypes.has(t));
  const typesToGenerate = missingTypes.length > 0 ? missingTypes : MEAL_ORDER;

  const dislikesSection = profile.dislikedIngredients.length > 0
    ? `\n\nBEZWZGLĘDNIE ZAKAZANE składniki (NIGDY nie używaj):\n${profile.dislikedIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const equipmentSection = profile.equipment.length > 0
    ? `\n\nDostępny sprzęt kuchenny:\n${profile.equipment.map(e => `- ${e}`).join('\n')}`
    : '';

  const preferredSection = profile.preferredIngredients.length > 0
    ? `\n\nLubiane składniki użytkownika (waga sugestii: 1%). To NIE jest lista zakupów ani obowiązkowa baza. Maksymalnie jeden z generowanych posiłków może świadomie nawiązywać do tej listy; pozostałe mają wynikać z bilansu makro, sensu kulinarnego i różnorodności. Nie łącz kilku lubianych rzeczy w jednym daniu, jeśli nie tworzą normalnej potrawy:\n${profile.preferredIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const vegetableRuleSection = profile.vegetableRule
    ? `\n\nZasada dotycząca warzyw: ${profile.vegetableRule}`
    : '';

  const otherDaysTitles = (otherDays ?? []).flatMap(d => d.meals.map(m => m.title)).slice(-35);
  const varietySection = otherDaysTitles.length > 0
    ? `\n\nUnikaj powtarzania tych dań z innych dni:\n${otherDaysTitles.join(', ')}`
    : '';

  const keptSection = kept.length > 0
    ? `\n\nWAŻNE — te posiłki SĄ JUŻ zaplanowane na ten dzień (NIE generuj ich ponownie, uwzględnij ich makro w bilansie dnia):\n${kept.map(m => `- ${m.type}: ${m.title} (${m.kcal} kcal, ${m.protein}g białka)`).join('\n')}`
    : '';

  const creativitySection = `\n\nKREATYWNOŚĆ I RÓŻNORODNOŚĆ (bardzo ważne): proponuj inne, urozmaicone dania — różne źródła białka, różne bazy węglowodanowe, różne techniki przygotowania, różne profile smakowe. Nie powtarzaj tego samego schematu typu "kurczak + ziemniaki" w kilku wariantach.`;

  const culinarySenseSection = `\n\nSENS KULINARNY (obowiązkowe): każdy posiłek musi być normalną, spójną potrawą. Zakazane są przypadkowe zlepki lubianych produktów, szczególnie przekąsek z mięsem/wędliną, np. "popcorn z szynką", "chipsy z indykiem", "dżem z mięsem". Przekąski typu popcorn/chipsy/orzeszki mogą być tylko logiczną przekąską albo małym dodatkiem, nigdy bazą obiadu/kolacji z mięsem.`;

  return `Jesteś polskim asystentem dietetycznym specjalizującym się w planowaniu posiłków dla rekompozycji sylwetki.

Zadanie: Wygeneruj ${typesToGenerate.length} ${typesToGenerate.length === 1 ? 'posiłek' : 'posiłków'} (typy: ${typesToGenerate.join(', ')}), aby UZUPEŁNIĆ plan dnia do celów makro.

Profil użytkownika:
- Waga: ${profile.weight} kg
- Wzrost: ${profile.height} cm
- Cel: ${profile.goal}

Cele makro do UZUPEŁNIENIA przez generowane posiłki (po odjęciu już zaplanowanych):
- Kalorie: ${targetKcalMin}–${targetKcalMax} kcal (TWARDY LIMIT ±2% — SUMA wygenerowanych posiłków MUSI zmieścić się w tym przedziale. Policz kalorie każdego posiłku i upewnij się, że łączna suma MIEŚCI SIĘ w ${targetKcalMin}–${targetKcalMax} kcal. Jeśli nie — skoryguj porcje.)
- Białko: ${targetProteinMin}–${targetProteinMax} g
- Węglowodany: ${targetCarbsMin}–${targetCarbsMax} g
- Tłuszcze: ${targetFatsMin}–${targetFatsMax} g${keptSection}${dislikesSection}${equipmentSection}${preferredSection}${vegetableRuleSection}${varietySection}${creativitySection}${culinarySenseSection}

Wygeneruj posiłki typu: ${typesToGenerate.join(', ')}.

${INGREDIENT_FORMAT_RULE}

Odpowiedz WYŁĄCZNIE poprawną tablicą JSON (bez markdown, bez dodatkowego tekstu) z dokładnie ${typesToGenerate.length} obiektami:
[
  {
    "id": "unikalne-id-1",
    "type": "${typesToGenerate[0]}",
    "title": "Nazwa posiłku",
    "kcal": liczba,
    "protein": liczba,
    "carbs": liczba,
    "fats": liczba,
    "ingredients": ["nazwa (ilość jednostka)", "..."],
    "instruction": "Instrukcja przygotowania",
    "tip": "Opcjonalna wskazówka smaku",
    "eaten": false
  }
]`;
}

export function buildFridgePrompt(
  ingredients: string,
  mealType: string,
  profile: UserProfile
): string {
  const dislikesSection = profile.dislikedIngredients.length > 0
    ? `\n\nBEZWZGLĘDNIE ZAKAZANE składniki (NIGDY nie używaj, nawet jeśli użytkownik je wpisał):\n${profile.dislikedIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const equipmentSection = profile.equipment.length > 0
    ? `\n\nDostępny sprzęt kuchenny:\n${profile.equipment.map(e => `- ${e}`).join('\n')}`
    : '';

  const vegetableRuleSection = profile.vegetableRule
    ? `\n\nZasada dotycząca warzyw: ${profile.vegetableRule}`
    : '';

  const mealTypeInstruction = mealType === 'dowolny'
    ? 'Zaproponuj posiłki dowolnego typu (śniadanie, obiad lub kolacja) — wybierz najlepiej pasujący typ dla każdej propozycji.'
    : `Wszystkie propozycje mają być typu: ${mealType}.`;

  return `Jesteś polskim asystentem dietetycznym. Użytkownik podaje składniki, które ma w lodówce/szafce.

Składniki dostępne u użytkownika:
${ingredients}

Zadanie: Zaproponuj 3 różne pomysły na posiłki, które można przygotować GŁÓWNIE z tych składników (możesz założyć podstawowe dodatki jak sól, pieprz, olej, przyprawy). ${mealTypeInstruction}

Dla każdej propozycji oblicz przybliżone makroskładniki (kalorie, białko, węglowodany, tłuszcze).${dislikesSection}${equipmentSection}${vegetableRuleSection}

${INGREDIENT_FORMAT_RULE}

Odpowiedz WYŁĄCZNIE poprawną tablicą JSON (bez markdown, bez dodatkowego tekstu) z 3 obiektami:
[
  {
    "id": "unikalne-id-1",
    "type": "${mealType === 'dowolny' ? 'Obiad' : mealType}",
    "title": "Nazwa posiłku",
    "kcal": liczba,
    "protein": liczba,
    "carbs": liczba,
    "fats": liczba,
    "ingredients": ["nazwa (ilość jednostka)", "..."],
    "instruction": "Instrukcja przygotowania",
    "tip": "Opcjonalna wskazówka",
    "eaten": false
  },
  ...
]`;
}


export function buildEstimatePrompt(
  description: string,
  mealType: string
): string {
  return `Jesteś polskim asystentem dietetycznym. Użytkownik opisuje co zjadł — oszacuj makroskładniki.

Opis posiłku: ${description}
Typ posiłku: ${mealType}

Zadanie: Oszacuj kalorie i makroskładniki (białko, węglowodany, tłuszcze) dla tego posiłku. Podaj składniki jeśli je znasz. Instrukcja powinna być pusta (użytkownik już to zjadł).

Odpowiedz WYŁĄCZNIE poprawnym obiektem JSON (bez bloków markdown, bez dodatkowego tekstu):
{
  "id": "temp",
  "type": "${mealType}",
  "title": "Krótka nazwa posiłku",
  "kcal": liczba,
  "protein": liczba,
  "carbs": liczba,
  "fats": liczba,
  "ingredients": ["składnik 1", "składnik 2"],
  "instruction": "",
  "eaten": true
}`;
}

import type { Meal, MealType, UserProfile, DayPlan } from '../types';

export function buildSwapPrompt(
  meal: Meal,
  profile: UserProfile,
  comment?: string
): string {
  const targetKcalMin = Math.round(meal.kcal * 0.9);
  const targetKcalMax = Math.round(meal.kcal * 1.1);
  const targetProteinMin = Math.round(meal.protein * 0.9);
  const targetProteinMax = Math.round(meal.protein * 1.1);
  const targetCarbsMin = Math.round(meal.carbs * 0.9);
  const targetCarbsMax = Math.round(meal.carbs * 1.1);
  const targetFatsMin = Math.round(meal.fats * 0.9);
  const targetFatsMax = Math.round(meal.fats * 1.1);

  const dislikesSection = profile.dislikedIngredients.length > 0
    ? `\n\nBEZWZGLĘDNIE ZAKAZANE składniki (NIGDY nie używaj):\n${profile.dislikedIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const equipmentSection = profile.equipment.length > 0
    ? `\n\nDostępny sprzęt kuchenny:\n${profile.equipment.map(e => `- ${e}`).join('\n')}`
    : '';

  const preferredSection = profile.preferredIngredients.length > 0
    ? `\n\nLubiane składniki (TYLKO luźna inspiracja — NIE musisz ich używać, posiłek NIE musi ich zawierać; traktuj jako delikatną podpowiedź smaku):\n${profile.preferredIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const vegetableRuleSection = profile.vegetableRule
    ? `\n\nZasada dotycząca warzyw: ${profile.vegetableRule}`
    : '';

  const commentSection = comment
    ? `\n\nDodatkowe uwagi użytkownika: ${comment}`
    : '';

  return `Jesteś polskim asystentem dietetycznym specjalizującym się w planowaniu posiłków dla rekompozycji sylwetki.

Zadanie: Wymień poniższy posiłek na alternatywę o zbliżonych makroskładnikach.

Aktualny posiłek do wymiany:
${JSON.stringify(meal, null, 2)}

Docelowe makroskładniki (±10% od oryginału):
- Kalorie: ${targetKcalMin}–${targetKcalMax} kcal
- Białko: ${targetProteinMin}–${targetProteinMax} g
- Węglowodany: ${targetCarbsMin}–${targetCarbsMax} g
- Tłuszcze: ${targetFatsMin}–${targetFatsMax} g${dislikesSection}${equipmentSection}${preferredSection}${vegetableRuleSection}${commentSection}

Odpowiedz WYŁĄCZNIE poprawnym obiektem JSON (bez bloków markdown, bez dodatkowego tekstu) w następującym formacie:
{
  "id": "unikalne-id",
  "type": "${meal.type}",
  "title": "Nazwa posiłku",
  "kcal": liczba,
  "protein": liczba,
  "carbs": liczba,
  "fats": liczba,
  "ingredients": ["składnik 1", "składnik 2"],
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

  // Remaining targets after accounting for meals already on the day
  const remKcal = Math.max(profile.dailyCalorieTarget - keptKcal, 0);
  const remProtein = Math.max(profile.dailyProteinTarget - keptProtein, 0);

  const targetKcalMin = Math.round(remKcal * 0.92);
  const targetKcalMax = Math.round(remKcal * 1.08);
  const targetProteinMin = Math.max(remProtein - 8, 0);
  const targetProteinMax = remProtein + 8;

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
    ? `\n\nLubiane składniki (TYLKO luźna inspiracja — NIE musisz ich używać w każdym posiłku):\n${profile.preferredIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const vegetableRuleSection = profile.vegetableRule
    ? `\n\nZasada dotycząca warzyw: ${profile.vegetableRule}`
    : '';

  const otherDaysTitles = (otherDays ?? []).flatMap(d => d.meals.map(m => m.title));
  const varietySection = otherDaysTitles.length > 0
    ? `\n\nUnikaj powtarzania tych dań z innych dni:\n${otherDaysTitles.join(', ')}`
    : '';

  const keptSection = kept.length > 0
    ? `\n\nWAŻNE — te posiłki SĄ JUŻ zaplanowane na ten dzień (NIE generuj ich ponownie, uwzględnij ich makro w bilansie dnia):\n${kept.map(m => `- ${m.type}: ${m.title} (${m.kcal} kcal, ${m.protein}g białka)`).join('\n')}`
    : '';

  const creativitySection = `\n\nKREATYWNOŚĆ I RÓŻNORODNOŚĆ (bardzo ważne): Bądź pomysłowy i za każdym razem proponuj INNE, urozmaicone dania — różne smaki, różne techniki przygotowania, inspiracje z różnych kuchni świata. Unikaj schematycznych, powtarzalnych zestawów. Zaskocz ciekawymi, ale realnymi i smacznymi propozycjami.`;

  return `Jesteś polskim asystentem dietetycznym specjalizującym się w planowaniu posiłków dla rekompozycji sylwetki.

Zadanie: Wygeneruj ${typesToGenerate.length} ${typesToGenerate.length === 1 ? 'posiłek' : 'posiłków'} (typy: ${typesToGenerate.join(', ')}), aby UZUPEŁNIĆ plan dnia do celów makro.

Profil użytkownika:
- Waga: ${profile.weight} kg
- Wzrost: ${profile.height} cm
- Cel: ${profile.goal}

Cele makro do UZUPEŁNIENIA przez generowane posiłki (po odjęciu już zaplanowanych):
- Kalorie: ${targetKcalMin}–${targetKcalMax} kcal
- Białko: ${targetProteinMin}–${targetProteinMax} g${keptSection}${dislikesSection}${equipmentSection}${preferredSection}${vegetableRuleSection}${varietySection}${creativitySection}

Wygeneruj posiłki typu: ${typesToGenerate.join(', ')}.

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
    "ingredients": ["składnik 1", "składnik 2"],
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
    "ingredients": ["składnik 1", "składnik 2"],
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

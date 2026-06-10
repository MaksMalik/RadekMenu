import type { Meal, UserProfile, DayPlan } from '../types';

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

export function buildFullDayPrompt(
  profile: UserProfile,
  existingDays?: DayPlan[]
): string {
  const targetKcalMin = Math.round(profile.dailyCalorieTarget * 0.95);
  const targetKcalMax = Math.round(profile.dailyCalorieTarget * 1.05);
  const targetProteinMin = profile.dailyProteinTarget - 5;
  const targetProteinMax = profile.dailyProteinTarget + 5;

  const dislikesSection = profile.dislikedIngredients.length > 0
    ? `\n\nBEZWZGLĘDNIE ZAKAZANE składniki (NIGDY nie używaj):\n${profile.dislikedIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const equipmentSection = profile.equipment.length > 0
    ? `\n\nDostępny sprzęt kuchenny:\n${profile.equipment.map(e => `- ${e}`).join('\n')}`
    : '';

  const preferredSection = profile.preferredIngredients.length > 0
    ? `\n\nLubiane składniki (TYLKO luźna inspiracja — NIE musisz ich używać w każdym posiłku; bądź kreatywny i różnorodny, używaj też innych bezpiecznych produktów):\n${profile.preferredIngredients.map(i => `- ${i}`).join('\n')}`
    : '';

  const vegetableRuleSection = profile.vegetableRule
    ? `\n\nZasada dotycząca warzyw: ${profile.vegetableRule}`
    : '';

  const varietySection = existingDays && existingDays.length > 0
    ? `\n\nUnikaj powtarzania tych składników/posiłków z poprzednich dni:\n${existingDays
        .flatMap(d => d.meals.map(m => m.title))
        .join(', ')}`
    : '';

  return `Jesteś polskim asystentem dietetycznym specjalizującym się w planowaniu posiłków dla rekompozycji sylwetki.

Zadanie: Wygeneruj pełny plan żywieniowy na jeden dzień składający się z dokładnie 5 posiłków.

Profil użytkownika:
- Waga: ${profile.weight} kg
- Wzrost: ${profile.height} cm
- Cel: ${profile.goal}
- Posiłki dziennie: ${profile.mealsPerDay}

Cele makroskładników na cały dzień (suma 5 posiłków):
- Kalorie: ${targetKcalMin}–${targetKcalMax} kcal (cel: ${profile.dailyCalorieTarget} kcal ±5%)
- Białko: ${targetProteinMin}–${targetProteinMax} g (cel: ${profile.dailyProteinTarget} g ±5g)

Wymagane typy posiłków (dokładnie 5, w tej kolejności):
1. Śniadanie
2. II Śniadanie
3. Obiad
4. Przekąska
5. Kolacja${dislikesSection}${equipmentSection}${preferredSection}${vegetableRuleSection}${varietySection}

Odpowiedz WYŁĄCZNIE poprawną tablicą JSON (bez bloków markdown, bez dodatkowego tekstu) zawierającą dokładnie 5 obiektów w następującym formacie:
[
  {
    "id": "unikalne-id-1",
    "type": "Śniadanie",
    "title": "Nazwa posiłku",
    "kcal": liczba,
    "protein": liczba,
    "carbs": liczba,
    "fats": liczba,
    "ingredients": ["składnik 1", "składnik 2"],
    "instruction": "Instrukcja przygotowania",
    "tip": "Opcjonalna wskazówka smaku",
    "eaten": false
  },
  ...
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

# Requirements Document

## Introduction

A premium SaaS-style single-page application (SPA) — "Personalized Silhouette Recomposition Assistant & 14-Day Diet/Workout Planner" — built with React + TypeScript (Vite), deployed on Vercel. The application helps a male user (76kg, 178cm, skinny-fat physique) achieve body recomposition through a structured 14-day interactive diet planner, a 4-day upper/lower workout split, AI-powered meal generation and swapping via Google Gemini 2.0 Flash Lite, and a bulk shopping/cooking guide generator. All UI text is in Polish.

## Glossary

- **App**: The Silhouette Planner single-page application
- **User**: The primary end-user (76kg, 178cm, male, skinny-fat, recomposition goal)
- **DietView**: The interactive 14-day diet planner component
- **WorkoutView**: The 4-day upper/lower split workout tracker component
- **ProfileDrawer**: The collapsible right-side profile/settings drawer
- **MealCard**: A UI card representing a single meal with macros, ingredients, and instructions
- **Meal**: A structured data object with title, type, kcal, protein, carbs, fats, ingredients, instruction, and optional tip fields
- **DayPlan**: A collection of 5 Meals assigned to a specific day (1–14)
- **MacroBar**: A progress bar showing consumed vs. target for a macro nutrient
- **ShoppingList**: A deduplicated, alphabetized list of ingredients for selected days
- **CookingGuide**: A sequential step-by-step cooking instruction document for selected days
- **AI_Swap**: The AI-powered meal replacement flow using Google Gemini 2.0 Flash Lite
- **Gemini_Client**: The wrapper for Google Gemini API calls
- **UserContext**: The global React context holding all application state
- **HistoryStack**: The undo/redo state history maintained in UserContext
- **LocalStorage**: The browser persistence layer used for caching all state
- **StepTracker**: The interactive daily step-count progress indicator

---

## Requirements

### Requirement 1: Project Foundation & Tech Stack

**User Story:** As a developer, I want a well-structured React + TypeScript project, so that the application is maintainable, type-safe, and deployable to Vercel.

#### Acceptance Criteria

1. THE App SHALL be built with React 18+ and TypeScript using Vite as the build tool.
2. THE App SHALL use Tailwind CSS for styling with the configured design tokens (emerald, amber/gold, slate, graphite).
3. THE App SHALL use Framer Motion (motion/react) for all animated transitions and interactive feedback.
4. THE App SHALL use Lucide React for all icons.
5. THE App SHALL use no `any` TypeScript types; all data structures MUST be fully typed via `src/types.ts`.
6. THE App SHALL be structured with the following files: `src/types.ts`, `src/context/UserContext.tsx`, `src/App.tsx`, `src/components/DietView.tsx`, `src/components/WorkoutView.tsx`, `src/components/ProfileDrawer.tsx`, and additional component files as needed.
7. THE App SHALL render entirely in Polish language for all user-facing text.
8. THE App SHALL be deployable to Vercel without additional configuration.

---

### Requirement 2: Design System & Visual Language

**User Story:** As a user, I want a premium, elegant visual experience, so that the application feels high-end and motivating to use daily.

#### Acceptance Criteria

1. THE App SHALL use slate-50/slate-100 as background colors and pure white for card surfaces.
2. THE App SHALL apply `rounded-3xl` border-radius to all primary cards and panels.
3. THE App SHALL apply `shadow-sm` or `shadow-md` to all elevated surfaces.
4. THE App SHALL use emerald (emerald-600/emerald-700) as the primary accent color for interactive elements.
5. THE App SHALL use amber/gold tones for nutrition-related indicators and badges.
6. THE App SHALL use deep graphite (slate-800/slate-900) for primary text.
7. THE App SHALL use a sans-serif font stack (Geist or Inter fallback) for all typography.
8. WHEN any interactive element is hovered or focused, THE App SHALL apply a smooth Framer Motion transition (duration ≤ 200ms).

---

### Requirement 3: Application Layout & Navigation

**User Story:** As a user, I want a clear main layout with tabbed navigation and a collapsible profile panel, so that I can switch between diet and workout views efficiently.

#### Acceptance Criteria

1. THE App SHALL display a persistent top header with the application title, a tab switcher for "Dieta" and "Trening" views, and a "Profil & Cele" button.
2. WHEN the "Dieta" tab is active, THE App SHALL render the DietView component as the main content.
3. WHEN the "Trening" tab is active, THE App SHALL render the WorkoutView component as the main content.
4. THE ProfileDrawer SHALL be hidden by default and fixed to the right side of the viewport.
5. WHEN the user clicks the "Profil & Cele" button, THE ProfileDrawer SHALL animate open (slide in from right using Framer Motion).
6. WHEN the user clicks outside the ProfileDrawer or a close button, THE ProfileDrawer SHALL animate closed (slide out to right using Framer Motion).
7. THE App SHALL be responsive and usable on both desktop and mobile viewports.

---

### Requirement 4: User Profile & Seed Data

**User Story:** As a user, I want my personal metrics and preferences pre-loaded, so that the application is immediately useful without manual configuration.

#### Acceptance Criteria

1. THE UserContext SHALL initialize with the following seed profile: weight 76kg, height 178cm, goal "recomposition", daily calorie target 2200 kcal, daily protein target 150g, 5 meals per day.
2. THE UserContext SHALL store the user's cooking equipment list: Airfryer, Opiekacz/Toster.
3. THE UserContext SHALL store the user's strict dislike list (never generate): ryż, kasza, rzodkiewki, kalafior, brokuły, szpinak, marchewki, zwykły chleb, sałatka ziemniaczana.
4. THE UserContext SHALL store the vegetable nuance rule: no standalone tomatoes or peppers — only hidden inside dishes.
5. THE UserContext SHALL store the user's preferred ingredient list: ziemniaki, kurczak, indyk, wołowina, wieprzowina, makaron, wrapy, chleb tostowy pszenny, kajzerki, dżemy, skyry, puddingi proteinowe, jogurty pitne bez kawałków owoców, jajka, sery, szynka z kurczaka, ogórki kiszone/zielone, banany, jabłka, gruszki, kiwi, truskawki, borówki, maliny, popcorn, orzeszki solone, chipsy/chrupki.
6. THE UserContext SHALL initialize the 14-day plan with Day 1 seed data containing exactly 5 meals as specified in the project overview.
7. WHEN the App initializes, THE UserContext SHALL attempt to restore state from localStorage before applying defaults.

---

### Requirement 5: 14-Day Diet Planner — Navigation & Day Grid (DietView)

**User Story:** As a user, I want to navigate a 14-day meal grid and select any day to view its full meal plan, so that I can plan and review my entire two-week diet cycle.

#### Acceptance Criteria

1. THE DietView SHALL display a week navigation grid split into Week 1 (Days 1–7) and Week 2 (Days 8–14).
2. WHEN a day cell in the grid is clicked, THE DietView SHALL display the full meal plan for that day as a list of MealCards.
3. THE DietView SHALL visually indicate which day is currently selected (highlighted cell).
4. THE DietView SHALL visually indicate which days have meal data populated vs. empty (distinct visual state).
5. WHEN viewing a selected day, THE DietView SHALL display that day's name in Polish (e.g., "Poniedziałek – Dzień 1").
6. THE DietView SHALL include a "Wygeneruj dzień przez AI" button for the selected day.
7. WHEN "Wygeneruj dzień przez AI" is clicked, THE DietView SHALL display a premium loading state (animated spinner or skeleton) while the AI generates all 5 meals.

---

### Requirement 6: Daily Macro Progress Bars

**User Story:** As a user, I want to see my daily macro progress at a glance, so that I know how my meal plan aligns with my targets.

#### Acceptance Criteria

1. THE DietView SHALL display four MacroBars for the selected day: Calories (target 2200 kcal), Protein (target 150g), Carbs, and Fats.
2. THE MacroBars SHALL calculate totals by summing the corresponding macro values across all meals in the selected DayPlan.
3. THE MacroBars SHALL display both the consumed total and the target value numerically.
4. WHEN a meal is toggled as "Zjedz posiłek" (eaten), THE MacroBars SHALL update to reflect only the macros from eaten meals vs. total planned macros.
5. THE Calories MacroBar SHALL use amber/gold color accent.
6. THE Protein MacroBar SHALL use emerald color accent.
7. WHEN a MacroBar value exceeds its target, THE MacroBar SHALL visually indicate the overflow (e.g., color change to red or amber warning).

---

### Requirement 7: Meal Card Display

**User Story:** As a user, I want each meal displayed in a rich, structured card format, so that I can clearly see all nutritional details and cooking instructions.

#### Acceptance Criteria

1. THE MealCard SHALL display a meal type badge (e.g., "Śniadanie", "Obiad") at the top left.
2. THE MealCard SHALL display a color-coded Kcal badge with a Flame icon (Lucide) showing the meal's calorie count.
3. THE MealCard SHALL display a Protein badge with a Zap icon (Lucide) showing protein in grams.
4. THE MealCard SHALL display Carbs and Fats values in a `font-mono` style marker.
5. THE MealCard SHALL display the meal title in bold.
6. THE MealCard SHALL display a two-column grid below the title: left column "SKŁADNIKI" as a bullet-point list, right column "INSTRUKCJA" in an italicized styled container.
7. WHERE a meal has an optional tip (`wskazówka`), THE MealCard SHALL display a "💡 Wskazówka smaku" box below the two-column grid.
8. THE MealCard SHALL display a bottom action bar with buttons: "Zjedz posiłek" toggle, "Edytuj", "Wymień posiłek", and "Usuń".

---

### Requirement 8: Meal Actions — Eaten Toggle

**User Story:** As a user, I want to mark meals as eaten, so that I can track my actual daily intake against my plan.

#### Acceptance Criteria

1. WHEN the user clicks "Zjedz posiłek" on a MealCard, THE MealCard SHALL visually dim (reduced opacity) to indicate it has been eaten.
2. WHEN "Zjedz posiłek" is toggled ON, THE DietView MacroBars SHALL add that meal's macros to the daily "eaten" running total.
3. WHEN "Zjedz posiłek" is toggled OFF (clicked again), THE MealCard SHALL return to normal appearance and THE DietView MacroBars SHALL remove that meal's macros from the eaten total.
4. THE eaten state for each meal SHALL be persisted in UserContext and localStorage.

---

### Requirement 9: Meal Actions — Manual Edit Modal

**User Story:** As a user, I want to manually edit any meal's details, so that I can customize my plan without relying on AI.

#### Acceptance Criteria

1. WHEN the user clicks "Edytuj" on a MealCard, THE App SHALL open a modal editor for that meal.
2. THE modal editor SHALL include fields for: meal title, kcal, protein (g), carbs (g), fats (g), ingredients (multi-line text), and instructions (multi-line text).
3. WHEN the user saves the modal, THE UserContext SHALL update the corresponding meal in the DayPlan and persist to localStorage.
4. WHEN the user cancels the modal, THE App SHALL discard all unsaved changes and close the modal.
5. THE edit action SHALL push the previous meal state onto the HistoryStack before saving.

---

### Requirement 10: Meal Actions — Delete with Confirmation

**User Story:** As a user, I want to delete a meal with a confirmation step, so that I don't accidentally remove meal data.

#### Acceptance Criteria

1. WHEN the user clicks "Usuń" on a MealCard, THE App SHALL display a custom confirmation dialog (not the browser default).
2. THE confirmation dialog SHALL show the meal title and ask the user to confirm deletion in Polish.
3. WHEN the user confirms deletion, THE App SHALL remove the meal from the DayPlan, update UserContext, and persist to localStorage.
4. WHEN the user cancels deletion, THE App SHALL close the dialog with no changes.
5. THE delete action SHALL push the previous meal state onto the HistoryStack before deletion.

---

### Requirement 11: Copy/Paste Day Plan

**User Story:** As a user, I want to copy one day's meal plan and paste it into another day, so that I can efficiently reuse successful meal plans.

#### Acceptance Criteria

1. THE DietView SHALL provide a "Kopiuj dzień" button for the currently selected day.
2. WHEN "Kopiuj dzień" is clicked, THE UserContext SHALL store a copy of that day's full meal plan in a clipboard buffer.
3. THE DietView SHALL provide a "Wklej dzień" button that is enabled only when a clipboard buffer is present.
4. WHEN "Wklej dzień" is clicked for a target day, THE UserContext SHALL replace that day's meal plan with the clipboard contents and persist to localStorage.
5. THE paste action SHALL push the previous target day's state onto the HistoryStack before overwriting.

---

### Requirement 12: AI Meal Swap (AI_Swap)

**User Story:** As a user, I want to swap any meal with an AI-generated alternative, so that I can maintain dietary variety while respecting my preferences and constraints.

#### Acceptance Criteria

1. WHEN the user clicks "Wymień posiłek" on a MealCard, THE App SHALL open the AI Swap Modal.
2. THE AI Swap Modal SHALL display the current meal's name and macro footprint (kcal, protein, carbs, fats).
3. THE AI Swap Modal SHALL include a textarea for the user to provide optional comments or swap preferences in Polish.
4. WHEN the user confirms the swap, THE Gemini_Client SHALL send a structured prompt to Google Gemini 2.0 Flash Lite requesting a replacement meal as JSON matching the Meal interface.
5. THE Gemini_Client prompt SHALL instruct Gemini to: match the original meal's calorie and protein values within ±10%, avoid all items in the user's dislike list, respect the vegetable nuance rule, use only the user's available cooking equipment, and prefer items from the user's preferred ingredient list.
6. WHEN Gemini returns a valid JSON Meal object, THE App SHALL replace the original meal in the DayPlan, update UserContext, and persist to localStorage.
7. IF Gemini returns invalid or unparseable JSON, THE App SHALL display a Polish error message and keep the original meal unchanged.
8. THE swap action SHALL push the previous meal state onto the HistoryStack before replacing.

---

### Requirement 13: AI Full-Day Generation

**User Story:** As a user, I want to generate a full day's meal plan via AI, so that I can quickly populate empty days in my 14-day planner.

#### Acceptance Criteria

1. WHEN the user clicks "Wygeneruj dzień przez AI", THE Gemini_Client SHALL send a prompt requesting 5 complete Meal objects as a JSON array.
2. THE prompt SHALL instruct Gemini to: target 2200 kcal total (±5%) across 5 meals, target 150g protein total (±5g), avoid all disliked ingredients, respect the vegetable nuance rule, use available cooking equipment, and prefer preferred ingredients without over-repeating any single ingredient.
3. WHEN Gemini returns a valid JSON array of 5 Meal objects, THE App SHALL replace the selected day's meal plan in UserContext and persist to localStorage.
4. IF Gemini returns invalid JSON or fewer than 5 meals, THE App SHALL display a Polish error message and keep the existing day plan unchanged.
5. THE full-day generation SHALL push the previous day's state onto the HistoryStack before replacing.

---

### Requirement 14: Gemini API Configuration

**User Story:** As a user, I want to configure my Gemini API key in the app, so that AI features work without requiring code changes.

#### Acceptance Criteria

1. THE ProfileDrawer SHALL include an API key input field labeled "Klucz API Gemini".
2. WHEN the user enters an API key in the ProfileDrawer and saves, THE UserContext SHALL store the key in localStorage.
3. THE Gemini_Client SHALL use the stored API key if available, falling back to the `VITE_GEMINI_API_KEY` environment variable.
4. IF neither a stored key nor the environment variable is available, THE App SHALL display a Polish warning that AI features are disabled.

---

### Requirement 15: Undo History (HistoryStack)

**User Story:** As a user, I want to undo recent changes to my meal plan, so that I can recover from accidental edits or unsatisfactory AI generations.

#### Acceptance Criteria

1. THE UserContext SHALL maintain a HistoryStack of previous DayPlan states (minimum 10 undo levels).
2. THE App SHALL display an "Cofnij" (Undo) button, visible as a floating or header button.
3. WHEN the user clicks "Cofnij", THE UserContext SHALL restore the most recent state from the HistoryStack and update the UI.
4. WHEN the HistoryStack is empty, THE "Cofnij" button SHALL be visually disabled.
5. THE following actions SHALL push to the HistoryStack before executing: meal edit, meal delete, meal swap (AI or manual), day copy/paste, and full-day AI generation.

---

### Requirement 16: LocalStorage Persistence

**User Story:** As a user, I want my plan to persist between browser sessions, so that I don't lose my progress when I close the tab.

#### Acceptance Criteria

1. THE UserContext SHALL serialize and save the full application state (all 14 DayPlans, user profile, API key, eaten states) to localStorage after every state-mutating action.
2. WHEN the App initializes, THE UserContext SHALL deserialize state from localStorage if a saved snapshot exists.
3. IF the localStorage snapshot is malformed or from an incompatible schema version, THE UserContext SHALL fall back to default seed data and log a console warning.
4. THE localStorage key SHALL be `silhouette-planner-state`.

---

### Requirement 17: Workout View (WorkoutView)

**User Story:** As a user, I want to view and track my 4-day upper/lower split workout routine, so that I can follow a structured training plan alongside my diet.

#### Acceptance Criteria

1. THE WorkoutView SHALL display a 4-day upper/lower split (Góra A, Dół A, Góra B, Dół B) repeatable routine mapped to workout days within the 14-day cycle.
2. THE WorkoutView SHALL list exercises for each workout day, specifying sets, reps, and equipment (pull-up bar or adjustable dumbbells 2.5kg–24kg).
3. THE WorkoutView SHALL include a StepTracker for daily step goals: 12,000 steps target, linked to workout days.
4. THE StepTracker SHALL allow the user to input or increment their daily step count.
5. WHEN the step count reaches or exceeds 12,000, THE StepTracker SHALL display a completion indicator.
6. THE WorkoutView exercise list SHALL use only the specified equipment: drążek do podciągania (pull-up bar) and adjustable dumbbells (2.5kg–24kg).

---

### Requirement 18: Shopping List Generator

**User Story:** As a user, I want to generate a shopping list from selected days in my plan, so that I can efficiently buy groceries for multiple days at once.

#### Acceptance Criteria

1. THE DietView (or a dedicated ShoppingView) SHALL provide a multi-checkbox interface to select any subset of the 14 days.
2. WHEN the user requests the "Lista Zakupów" for selected days, THE App SHALL aggregate all ingredients from all meals of those days.
3. THE ShoppingList SHALL deduplicate ingredients and sort them alphabetically.
4. THE ShoppingList SHALL display each ingredient as a checkbox item (checked/unchecked).
5. THE ShoppingList SHALL be formatted for Lidl/Biedronka shopping (common Polish grocery stores — simple ingredient names without brand specifications).

---

### Requirement 19: Cooking Guide Generator

**User Story:** As a user, I want to generate a step-by-step cooking guide for selected days, so that I can batch-cook meals efficiently.

#### Acceptance Criteria

1. WHEN the user selects days and opens the "Przepisy & Instrukcje" tab, THE App SHALL generate a sequential cooking guide for all meals of the selected days.
2. THE CookingGuide SHALL list recipes in day order, with each meal's instructions presented as numbered steps.
3. THE CookingGuide SHALL include tips optimized for Airfryer and Toaster (Opiekacz) cooking methods where applicable.
4. THE CookingGuide SHALL reference the instructions already stored in the Meal objects.

---

### Requirement 20: Architecture — Firebase Migration Readiness

**User Story:** As a developer, I want the data layer to be abstractable, so that a future migration from localStorage to Firebase is straightforward.

#### Acceptance Criteria

1. THE UserContext SHALL abstract all persistence operations behind a storage interface (read, write, clear) rather than calling `localStorage` directly throughout the codebase.
2. THE architecture documentation SHALL note that the storage interface is designed for future Firebase Firestore migration.
3. THE Meal and DayPlan data structures defined in `src/types.ts` SHALL be compatible with Firestore document structure (flat fields, no circular references, serializable values only).

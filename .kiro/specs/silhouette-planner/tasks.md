# Implementation Plan: Silhouette Planner

## Overview

A sequential implementation plan for the Silhouette Planner SPA — a React + TypeScript (Vite) 14-day diet/workout planner with AI-powered meal generation via Google Gemini 2.0 Flash Lite. Implementation proceeds from project scaffolding through core data layer, then UI components, then AI integration, and finally polish/testing.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize Vite + React + TypeScript project
    - Run `npm create vite@latest . -- --template react-ts`
    - Install dependencies: `tailwindcss`, `postcss`, `autoprefixer`, `framer-motion`, `lucide-react`, `fast-check` (dev)
    - Install test deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
    - Configure `tailwind.config.ts` with design tokens (emerald primary, amber nutrition, slate surfaces, Geist/Inter fonts, rounded-3xl)
    - Configure `vitest.config.ts` with jsdom environment
    - Create `src/index.css` with Tailwind directives
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1–2.7_

- [x] 2. Define types and data models
  - [x] 2.1 Create `src/types.ts` with all interfaces
    - Define: `MealType`, `Meal`, `DayPlan`, `MacroTargets`, `UserProfile`, `WorkoutDay`, `Exercise`, `StepCount`, `AppState`, `StorageInterface`, `AppAction`
    - Ensure all types are Firestore-compatible (flat fields, no circular refs, serializable)
    - No `any` types anywhere
    - _Requirements: 1.5, 20.3_

- [x] 3. Implement state management and persistence layer
  - [x] 3.1 Create `src/storage/localStorageAdapter.ts`
    - Implement `StorageInterface` with `read()`, `write()`, `clear()` methods
    - Use key `silhouette-planner-state`
    - Handle malformed data gracefully (try/catch, return null on parse failure)
    - Include schema version check
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 20.1_

  - [x] 3.2 Create `src/context/UserContext.tsx` with reducer and provider
    - Implement `appReducer` handling all `AppAction` types
    - Implement HistoryStack logic: push dayPlans snapshot before mutating actions (UPDATE_MEAL, DELETE_MEAL, REPLACE_MEAL, SET_DAY_MEALS, PASTE_DAY)
    - Cap history at 10 entries (drop oldest when exceeded)
    - Implement UNDO action (pop from history, restore dayPlans)
    - Implement COPY_DAY / PASTE_DAY with clipboard buffer
    - Initialize from localStorage → fallback to seed data (Day 1 with 5 meals, user profile with all preferences, equipment, dislikes)
    - Persist state via StorageInterface after every dispatch
    - Export `UserProvider`, `useUser()` hook, and dispatch
    - _Requirements: 4.1–4.7, 8.4, 9.3, 9.5, 10.3, 10.5, 11.2–11.5, 15.1–15.5, 16.1–16.4_

  - [x] 3.3 Create `src/data/seedData.ts`
    - Define default UserProfile (76kg, 178cm, recomposition, 2200kcal, 150g protein, 5 meals)
    - Define equipment, dislikes, preferences, vegetable rule
    - Define Day 1 seed meals (5 meals with full Meal objects)
    - Define workout plan (4-day upper/lower split with exercises)
    - _Requirements: 4.1–4.6, 17.1, 17.2, 17.6_

  - [ ]* 3.4 Write property tests for state persistence round-trip
    - **Property 1: State Persistence Round-Trip**
    - **Validates: Requirements 4.7, 16.1, 16.2**

  - [ ]* 3.5 Write property tests for history stack
    - **Property 5: History Push on Mutation**
    - **Property 6: History Stack Bounded**
    - **Property 7: Undo Restores Previous State**
    - **Validates: Requirements 9.5, 10.5, 11.5, 12.8, 13.5, 15.1, 15.3, 15.5**

- [x] 4. Checkpoint - Core data layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. App shell, layout, and navigation
  - [x] 5.1 Create `src/App.tsx` with layout structure
    - Wrap in `<UserProvider>`
    - Render Header, conditional TabContent (DietView or WorkoutView), ProfileDrawer
    - Manage state: activeTab, profileDrawerOpen, modal visibility states
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 Create `src/components/Header.tsx`
    - App title, tab switcher ("Dieta" / "Trening"), "Profil & Cele" button, "Cofnij" (undo) button
    - Undo button disabled when historyStack is empty
    - All text in Polish
    - Framer Motion hover transitions (≤200ms)
    - _Requirements: 3.1, 15.2, 15.4, 1.7, 2.8_

  - [x] 5.3 Create `src/components/ProfileDrawer.tsx`
    - Fixed right-side panel, hidden by default
    - Framer Motion slide-in/out animation
    - Display user profile info (weight, height, goal, targets)
    - API key input field labeled "Klucz API Gemini"
    - Save API key to UserContext on input
    - Close on outside click or close button
    - _Requirements: 3.4, 3.5, 3.6, 14.1, 14.2_

- [x] 6. DietView - Day grid navigation
  - [x] 6.1 Create `src/components/DietView.tsx` shell
    - Container component rendering DayGrid, MacroProgressBars, MealCardList
    - "Kopiuj dzień" and "Wklej dzień" buttons
    - "Wygeneruj dzień przez AI" button with loading state
    - _Requirements: 5.6, 5.7, 11.1, 11.3_

  - [x] 6.2 Create `src/components/DayGrid.tsx`
    - 14 cells in 2 rows (Week 1: days 1–7, Week 2: days 8–14)
    - Highlighted state for selected day
    - Distinct visual for populated vs empty days
    - Polish day name display (e.g., "Poniedziałek – Dzień 1")
    - onClick dispatches SELECT_DAY
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. DietView - Macro progress bars
  - [x] 7.1 Create `src/utils/macros.ts`
    - `computeTotals(meals: Meal[]): MacroTargets` — sums all meals
    - `computeEatenTotals(meals: Meal[]): MacroTargets` — sums only eaten meals
    - Pure functions, no side effects
    - _Requirements: 6.2, 6.4_

  - [x] 7.2 Create `src/components/MacroProgressBars.tsx`
    - 4 bars: Calories (amber), Protein (emerald), Carbs, Fats
    - Display consumed/target numerically
    - Overflow indicator when value exceeds target (color change)
    - Uses computeTotals and computeEatenTotals from utils
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.7_

  - [ ]* 7.3 Write property tests for macro computation
    - **Property 2: Macro Summation Correctness**
    - **Property 3: Eaten Macro Filtering**
    - **Validates: Requirements 6.2, 6.4, 8.2**

- [x] 8. DietView - Meal cards
  - [x] 8.1 Create `src/components/MealCard.tsx`
    - Meal type badge (top left)
    - Kcal badge with Flame icon (Lucide), Protein badge with Zap icon
    - Carbs and Fats in font-mono
    - Bold title
    - Two-column grid: "SKŁADNIKI" (bullet list) | "INSTRUKCJA" (italic)
    - Optional "💡 Wskazówka smaku" box
    - Bottom action bar: "Zjedz posiłek", "Edytuj", "Wymień posiłek", "Usuń"
    - Dimmed appearance when eaten (reduced opacity)
    - Rounded-3xl, shadow-sm card styling
    - _Requirements: 7.1–7.8, 8.1_

  - [ ]* 8.2 Write property test for toggle eaten inverse
    - **Property 4: Toggle Eaten is its Own Inverse**
    - **Validates: Requirements 8.3**

- [x] 9. DietView - Meal actions (modals)
  - [x] 9.1 Create `src/components/EditMealModal.tsx`
    - Form fields: title, kcal, protein, carbs, fats, ingredients (multi-line), instructions (multi-line)
    - Save dispatches UPDATE_MEAL (pushes to history)
    - Cancel discards changes and closes
    - Framer Motion enter/exit animation
    - _Requirements: 9.1–9.5_

  - [x] 9.2 Create `src/components/ConfirmDeleteDialog.tsx`
    - Custom dialog (not browser default)
    - Shows meal title, asks confirmation in Polish
    - Confirm dispatches DELETE_MEAL (pushes to history)
    - Cancel closes with no changes
    - _Requirements: 10.1–10.5_

  - [x] 9.3 Implement copy/paste day in DietView
    - "Kopiuj dzień" dispatches COPY_DAY
    - "Wklej dzień" enabled only when clipboard is non-null, dispatches PASTE_DAY (pushes to history)
    - _Requirements: 11.1–11.5_

  - [ ]* 9.4 Write property test for copy/paste preserves
    - **Property 8: Copy/Paste Preserves Day Plan**
    - **Validates: Requirements 11.4**

- [x] 10. Checkpoint - DietView complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. AI integration
  - [x] 11.1 Create `src/ai/geminiClient.ts`
    - GeminiClient class with `swapMeal()` and `generateFullDay()` methods
    - API key from UserContext (stored key or VITE_GEMINI_API_KEY env var)
    - Fetch-based HTTP calls to Gemini 2.0 Flash Lite endpoint
    - JSON parsing strategy: try full parse → extract from code fences → find first `[`/`{` → validate structure
    - Return `GeminiResponse` with success/error
    - _Requirements: 14.3, 12.4, 13.1_

  - [x] 11.2 Create `src/ai/promptTemplates.ts`
    - `buildSwapPrompt(meal, profile, comment?)`: includes current meal JSON, macro targets (±10%), all constraints (dislikes, equipment, preferences, vegetable rule), user comment
    - `buildFullDayPrompt(profile, existingDays?)`: includes daily targets (2200 kcal ±5%, 150g protein ±5g), 5 meal types required, all constraints, variety instruction
    - Both specify strict JSON output format matching Meal interface
    - All prompts in Polish context
    - _Requirements: 12.4, 12.5, 13.1, 13.2_

  - [x] 11.3 Create `src/components/SwapMealModal.tsx`
    - Display current meal name and macro footprint
    - Textarea for user comments/preferences
    - On confirm: call GeminiClient.swapMeal(), show loading state, dispatch REPLACE_MEAL on success
    - On error: show Polish toast error, keep original meal
    - Swap pushes to history before replacing
    - _Requirements: 12.1–12.8_

  - [x] 11.4 Implement full-day AI generation in DietView
    - "Wygeneruj dzień przez AI" button calls GeminiClient.generateFullDay()
    - Premium loading state (animated skeleton/spinner)
    - On success: dispatch SET_DAY_MEALS (pushes to history)
    - On error: Polish error toast, keep existing plan
    - _Requirements: 13.1–13.5, 5.6, 5.7_

  - [x] 11.5 Implement AI-disabled warning state
    - If no API key available (neither stored nor env var), show Polish warning banner
    - Disable AI buttons (swap, generate) when no key
    - _Requirements: 14.4_

  - [ ]* 11.6 Write property test for AI prompt constraints
    - **Property 9: AI Prompt Constraint Inclusion**
    - **Validates: Requirements 12.4, 12.5, 13.1, 13.2**

- [x] 12. WorkoutView component
  - [x] 12.1 Create `src/components/WorkoutView.tsx`
    - Display 4-day split: Góra A, Dół A, Góra B, Dół B
    - Each day shows exercises with sets, reps, equipment
    - Equipment: drążek do podciągania, adjustable dumbbells 2.5kg–24kg
    - StepTracker: input/increment daily steps, 12,000 target, completion indicator
    - Dispatch UPDATE_STEPS on input
    - _Requirements: 17.1–17.6_

- [x] 13. Shopping list and cooking guide
  - [x] 13.1 Create `src/utils/shoppingList.ts`
    - `generateShoppingList(dayPlans: DayPlan[]): string[]` — aggregates all ingredients, deduplicates, sorts alphabetically
    - Pure function
    - _Requirements: 18.2, 18.3, 18.5_

  - [x] 13.2 Create `src/utils/cookingGuide.ts`
    - `generateCookingGuide(dayPlans: DayPlan[]): CookingGuideEntry[]` — returns instructions in day-order, then meal-type order
    - Include tips for Airfryer/Toaster methods
    - Pure function
    - _Requirements: 19.1–19.4_

  - [x] 13.3 Create `src/components/ShoppingListModal.tsx`
    - Multi-checkbox day selector (14 days)
    - Display generated list with checkbox items
    - Simple ingredient names (Lidl/Biedronka style)
    - _Requirements: 18.1, 18.4, 18.5_

  - [x] 13.4 Create `src/components/CookingGuideModal.tsx`
    - Day selector
    - Sequential numbered steps per meal, grouped by day
    - References meal instruction data
    - _Requirements: 19.1–19.4_

  - [ ]* 13.5 Write property tests for shopping list
    - **Property 10: Shopping List Completeness**
    - **Property 11: Shopping List Deduplication and Sort**
    - **Validates: Requirements 18.2, 18.3**

  - [ ]* 13.6 Write property test for cooking guide
    - **Property 12: Cooking Guide Ordering**
    - **Validates: Requirements 19.1, 19.2**

- [x] 14. Checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Final polish and integration
  - [x] 15.1 Add toast notification system
    - Framer Motion animated toasts for errors and confirmations
    - Polish text for all messages
    - Auto-dismiss after 4 seconds
    - _Requirements: 12.7, 13.4, 14.4_

  - [x] 15.2 Responsive design pass
    - Ensure all components work on mobile viewports
    - Stack layouts vertically on small screens
    - DayGrid wraps appropriately
    - _Requirements: 3.7_

  - [x] 15.3 Framer Motion polish
    - Verify all interactive elements have hover/focus transitions (≤200ms)
    - Add page transition animations between tabs
    - Verify modal enter/exit animations
    - _Requirements: 2.8_

  - [x] 15.4 Verify Vercel deployment readiness
    - Ensure `vite.config.ts` produces static output
    - Add `vercel.json` if needed for SPA routing (rewrites to index.html)
    - _Requirements: 1.8_

- [x] 16. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"],
      "description": "Project scaffolding and configuration"
    },
    {
      "wave": 2,
      "tasks": ["2"],
      "description": "Type definitions"
    },
    {
      "wave": 3,
      "tasks": ["3"],
      "description": "State management, persistence, and seed data"
    },
    {
      "wave": 4,
      "tasks": ["4"],
      "description": "Checkpoint - Core data layer verification"
    },
    {
      "wave": 5,
      "tasks": ["5", "6", "7"],
      "description": "App shell, day grid navigation, and macro progress bars (parallel)"
    },
    {
      "wave": 6,
      "tasks": ["8"],
      "description": "Meal card component"
    },
    {
      "wave": 7,
      "tasks": ["9"],
      "description": "Meal action modals and copy/paste"
    },
    {
      "wave": 8,
      "tasks": ["10"],
      "description": "Checkpoint - DietView complete"
    },
    {
      "wave": 9,
      "tasks": ["11", "12", "13"],
      "description": "AI integration, WorkoutView, and shopping/cooking utilities (parallel)"
    },
    {
      "wave": 10,
      "tasks": ["14"],
      "description": "Checkpoint - All features complete"
    },
    {
      "wave": 11,
      "tasks": ["15"],
      "description": "Final polish, responsiveness, and deployment readiness"
    },
    {
      "wave": 12,
      "tasks": ["16"],
      "description": "Final checkpoint"
    }
  ]
}
```

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- All UI text must be in Polish (requirement 1.7 applies to every component)
- The storage abstraction (StorageInterface) is designed for future Firebase migration
- Property tests use fast-check with minimum 100 iterations
- Each task builds incrementally — later tasks depend on earlier ones being complete

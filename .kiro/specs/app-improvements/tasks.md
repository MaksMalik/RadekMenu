# Implementation Plan: App Improvements (Smakołysz)

## Overview

This plan implements the bundled improvements across four concerns: PWA refresh reliability (Requirements 1–4), AI reliability and correctness (Requirements 5–10), mobile UX (Requirements 11–13), and a React Error Boundary (Requirement 14). The implementation language is **TypeScript** (React 19 + Vite 8), matching the existing codebase.

The build order starts with the pure AI logic core (`src/ai/geminiLogic.ts`) so the highest-risk decision logic is testable first, then wires it into the refactored `GeminiClient`, then layers in the resilience and UI/UX components, and finally the declarative PWA and deployment configuration. Each step builds on the previous and ends with integration into the running app.

## Tasks

- [x] 1. Create AI logic core with constants and pure functions
  - [x] 1.1 Create `src/ai/geminiLogic.ts` with model constants and configuration values
    - Define `SUPPORTED_MODELS` (documented Gemini model ids) and `DEFAULT_MODEL = 'gemini-2.5-flash'`
    - Define `KCAL_BAND = 0.05`, `MAX_SWAP_ATTEMPTS = 4`, `DEFAULT_TIMEOUT_MS = 30000`, `MIN_TIMEOUT_MS = 1000`, `MAX_TIMEOUT_MS = 30000`, `MASK_CHAR = '•'`
    - Export `MEAL_SCHEMA` constant mirroring the validated `Meal` shape (excluding `id`/`eaten`) for structured output
    - Export the `GeminiErrorKind` type union
    - _Requirements: 5.1, 7.1_

  - [x] 1.2 Implement strict `validateMeal` type guard
    - Reject `calories`/`instructions` aliases; require `type` in the five `MealType` values
    - Require non-empty `title`/`instruction`, finite `kcal`/`protein`/`carbs`/`fats` >= 0, non-empty string array `ingredients`, and string `tip` when present
    - _Requirements: 7.3, 7.4_

  - [x] 1.3 Write property test for strict Meal validation
    - **Property 1: Strict Meal validation**
    - **Validates: Requirements 7.3, 7.4**

  - [x] 1.4 Write property test for structured Meal JSON round-trip
    - **Property 2: Structured Meal JSON round-trip**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 1.5 Implement swap selection and Kcal band helpers
    - Implement `isWithinKcalBand(kcal, originalKcal)` for the ±5% Kcal_Tolerance_Band
    - Implement `selectSwapResult(candidates, originalKcal)`: earliest in-band candidate, else smallest absolute kcal difference with earliest-position tie-break, else failure
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [x] 1.6 Write property test for swap selection
    - **Property 4: Swap selection picks the best candidate**
    - **Validates: Requirements 8.1, 8.3, 8.4, 8.5**

  - [x] 1.7 Implement error classification and Polish messaging
    - Implement `classifyGeminiError(status, body)` mapping HTTP status + body to `GeminiErrorKind` (invalid_model, invalid_key, missing_key, timeout, transient, processing, unknown)
    - Implement `errorMessage(kind)` returning Polish, key-free messages
    - _Requirements: 5.2, 5.3, 5.4, 6.2, 7.5_

  - [x] 1.8 Write property test for fatal error classification
    - **Property 6: Fatal Gemini errors stop retrying with a Polish message**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 1.9 Implement timeout clamping, key masking, and logging gate
    - Implement `clampTimeout(input)` resolving to [1000, 30000] ms, undefined → 30000
    - Implement `maskApiKey(key)` (same length, only mask chars) and `stripKey(message, key)`
    - Implement `isRawLoggingAllowed()` returning true only when `import.meta.env.DEV === true`
    - _Requirements: 6.1, 9.1, 9.3, 10.3, 10.4_

  - [x] 1.10 Write property tests for timeout clamp and key masking
    - **Property 9: Timeout value is clamped to the valid range**
    - **Property 12: API key masking hides every original character**
    - **Validates: Requirements 6.1, 10.3**

- [x] 2. Checkpoint - Ensure all logic-core tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Refactor GeminiClient to use the logic core
  - [x] 3.1 Implement transport layer `callGemini` with structured output and timeout
    - Build request with `generationConfig.responseMimeType: 'application/json'` and `responseSchema`
    - Apply `AbortController` + `setTimeout` using the clamped timeout; abort and discard partial data on timeout
    - Retry only on transient status (503/429) with capped backoff; do a single `JSON.parse` on the returned text
    - Short-circuit with a Polish "API key required" failure when the key is empty/whitespace, issuing no request
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 7.1, 7.2_

  - [x] 3.2 Implement `swapMeal` using the swap loop and `selectSwapResult`
    - Loop at most 4 times, one `callGemini` per iteration, validate each candidate, stop early on first in-band hit
    - After the loop, delegate to `selectSwapResult` for the closest-candidate fallback or failure
    - Return Polish, key-free error on total failure without modifying the original Meal
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 3.3 Write property test for swap request bounds and early stop
    - **Property 5: Swap issues between 1 and 4 requests and stops early**
    - **Validates: Requirements 8.2, 8.1**

  - [x] 3.4 Update remaining client methods, error funneling, and logging gate
    - Wire `generateFullDay`, `generateFromFridge`, and `estimateMealFromDescription` through `callGemini` with structured output and `validateMeal`
    - Funnel all failures through `GeminiResponse { success: false, error }` using `errorMessage`; ensure `error` never contains the key (`stripKey`)
    - Gate all raw-response logging behind `isRawLoggingAllowed()`; keep operational diagnostics permitted
    - Stop retrying on fatal `invalid_model`/`invalid_key`/`missing_key` kinds
    - _Requirements: 5.2, 5.3, 5.4, 7.5, 9.1, 9.2, 9.3, 9.4, 10.4_

  - [x] 3.5 Write property tests for parse failure, missing key, and key exclusion
    - **Property 3: Unparseable or invalid responses produce a failure**
    - **Property 7: Missing API key short-circuits without a request**
    - **Property 11: API key is excluded from returned error messages**
    - **Validates: Requirements 7.5, 5.4, 10.4**

  - [x] 3.6 Write property test for production logging suppression
    - **Property 10: Production builds never log raw AI responses**
    - **Validates: Requirements 9.1, 9.3**

  - [x] 3.7 Write unit tests for request shape and timeout behavior
    - Assert request body includes `responseMimeType` and a `responseSchema` with required fields (7.1)
    - Mocked hanging `fetch` + fake timers assert timeout `GeminiResponse` and no partial data; loading state cleared (6.2, 6.3, 6.4)
    - Assert DEV raw-log permitted and prod operational diagnostics permitted (9.2, 9.4)
    - _Requirements: 6.2, 6.3, 6.4, 7.1, 9.2, 9.4_

- [x] 4. Checkpoint - Ensure all AI tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement AI failure state safety
  - [x] 5.1 Ensure caller result handling never mutates the meal plan on failure
    - Verify/adjust `DietView` and modal handlers so a `success: false` result dispatches no mutating action and clears the in-progress loading flag in a finally-equivalent path
    - _Requirements: 5.5, 6.4_

  - [x] 5.2 Write property test for unchanged meal plan on failure
    - **Property 8: AI failures leave the meal plan unchanged**
    - **Validates: Requirements 5.5**

- [x] 6. Implement safe API key handling in Settings UI
  - [x] 6.1 Harden the API key field in `ProfileDrawer`
    - Mask every character by default with the uniform mask character; add a reveal toggle showing plaintext until deactivated or navigation away
    - Reject empty/whitespace saves, retain the previously stored key, and surface a Polish "API key required" error
    - On Firestore write failure, retain the previous key and surface a Polish save-failure error
    - _Requirements: 10.1, 10.3, 10.5, 10.6, 10.7_

  - [x] 6.2 Write property test and unit tests for key save and transmission
    - **Property 13: Empty key save is rejected and retains the previous key**
    - **Validates: Requirements 10.5**
    - Unit: fetch spy confirms key only sent to Gemini URL (10.2); reveal toggle shows plaintext (10.7); write-rejection retains key (10.6)
    - _Requirements: 10.2, 10.6, 10.7_

- [x] 7. Implement Error Boundary
  - [x] 7.1 Create `src/components/ErrorBoundary.tsx`
    - Implement `getDerivedStateFromError` and `componentDidCatch`
    - Render a Polish fallback (heading + message + single reload control); reload control reloads the app and clears the fallback
    - Show `error.message` and component stack in DEV only; hide both in production
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6_

  - [x] 7.2 Wrap the root tree with `ErrorBoundary` in `main.tsx`
    - Wrap `<App />` so any descendant render/lifecycle throw is caught
    - _Requirements: 14.4_

  - [x] 7.3 Write unit tests for the Error Boundary
    - Throwing child renders Polish fallback heading/message + single reload control; DEV shows stack, prod hides it; reload control invokes reload
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6_

- [x] 8. Implement responsive Modal / Bottom-Sheet wrapper
  - [x] 8.1 Create `src/components/Modal.tsx`
    - Below 640px render as a bottom sheet (full width, anchored bottom, slide-up/down 150–400ms, max-height = viewport with scrollable body)
    - At >= 640px render as a centered dialog; apply a 44x44px minimum touch-target utility to interactive controls
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 13.6, 13.7_

  - [x] 8.2 Adopt the Modal wrapper in existing modals
    - Refactor `AddMealModal`, `EditMealModal`, `SwapMealModal`, and `FridgeModal` to use the shared wrapper
    - Ensure mobile inputs render with computed font size >= 16px to prevent iOS auto-zoom
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 8.3 Write unit tests for Modal layout and touch targets
    - Render below/at 640px asserting bottom-sheet vs centered, 16px input font, 44x44 targets, animation durations 150–400ms, overflow scroll
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 9. Implement global mobile CSS and safe-area handling
  - [x] 9.1 Add global mobile baseline to `src/index.css`
    - Transparent `-webkit-tap-highlight-color` on interactive elements; `overscroll-behavior: none` on the root scroll container
    - Define safe-area inset support utilities for all four edges using `env(safe-area-inset-*)`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 9.2 Apply safe-area offsets to `index.html`, Header, FAB, and main content
    - Set the viewport meta to include `viewport-fit=cover`
    - Offset `Header` top by `env(safe-area-inset-top)`, FAB bottom by `env(safe-area-inset-bottom)`, and add main bottom padding >= bottom inset; fall back to base positions when insets are 0/absent
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 9.3 Write config/snapshot tests for CSS and viewport meta
    - Assert presence of transparent tap-highlight, `overscroll-behavior`, and `env(safe-area-inset-*)` rules (11.1, 11.3, 11.5)
    - Assert `index.html` viewport includes `viewport-fit=cover` (12.1)
    - _Requirements: 11.1, 11.3, 11.5, 12.1_

- [x] 10. Checkpoint - Ensure all UI/UX tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement PWA update manager and Workbox navigation strategy
  - [x] 11.1 Configure Workbox runtime caching in `vite.config.ts`
    - Set `registerType: 'prompt'`, `navigateFallback: '/index.html'` with denylist for `/assets/`, `/sw.js`, `/workbox-`
    - Add `NetworkFirst` navigation runtime caching with `networkTimeoutSeconds: 3` and `cleanupOutdatedCaches: true`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4_

  - [x] 11.2 Create `src/pwa/registerPwa.ts` PWA update manager
    - Use `registerSW` from `virtual:pwa-register`; on `onNeedRefresh` auto-apply via `updateSW(true)` when `hasPendingEdits()` is false, defer otherwise and re-check after edits flush
    - On activation failure, log an operational diagnostic and leave the current version active
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 11.3 Register the PWA update manager from `main.tsx`
    - Call `register({ hasPendingEdits })` wiring the pending-edits check to app state
    - _Requirements: 2.1, 2.2_

  - [x] 11.4 Write unit/snapshot tests for the PWA update manager and Workbox config
    - Mock `registerSW`: assert auto-apply when no pending edits, deferral when pending, current-version retention on activation failure (2.2, 2.3, 2.4)
    - Snapshot `runtimeCaching` NetworkFirst nav with `networkTimeoutSeconds: 3` and `navigateFallback` (1.3)
    - _Requirements: 1.3, 2.2, 2.3, 2.4_

- [x] 12. Validate deployment cache headers and model id
  - [x] 12.1 Verify/adjust `vercel.json` cache headers and add a header-validation predicate
    - Ensure `no-cache, no-store, must-revalidate` on `/index.html`, `no-cache` on `/sw.js`, `public, max-age=31536000, immutable` on `/assets/*`
    - Implement a reusable header-validation predicate rejecting permissive entry/sw headers and non-immutable/short-max-age asset headers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 12.2 Write config tests for cache headers and model id
    - Assert exact `vercel.json` header values (4.1–4.3) and that the validation predicate rejects bad headers (4.4, 4.5)
    - Assert `DEFAULT_MODEL ∈ SUPPORTED_MODELS` (5.1)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation across the logic core, AI layer, UI/UX, and PWA concerns.
- Property tests validate the universal correctness properties of the AI logic core and state invariants (`src/ai/geminiLogic.ts` and the reducer); PWA, CSS/layout, and Error Boundary concerns are validated with config/snapshot, example, and unit tests per the design's Testing Strategy.
- The implementation language is TypeScript, matching the existing React 19 + Vite codebase.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.5", "1.7", "1.9"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.6", "1.8", "1.10"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "3.4"] },
    { "id": 5, "tasks": ["3.3", "3.5", "3.6", "3.7", "5.1", "6.1"] },
    { "id": 6, "tasks": ["5.2", "6.2", "7.1", "8.1", "9.1", "11.1", "11.2", "12.1"] },
    { "id": 7, "tasks": ["7.2", "8.2", "9.2", "11.3"] },
    { "id": 8, "tasks": ["7.3", "8.3", "9.3", "11.4", "12.2"] }
  ]
}
```

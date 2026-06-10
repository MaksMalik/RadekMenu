# Requirements Document

## Introduction

This specification consolidates a set of improvements for **Smakołysz**, a React 19 + Vite 8 + TypeScript Progressive Web App (PWA) diet planner that uses Firebase/Firestore for storage and the Google Gemini API for AI features. The improvements are grouped into three areas, plus a cross-cutting reliability concern, and are prioritized so the most impactful fixes are addressed first.

The areas are:

1. **PWA / Service Worker refresh reliability (HIGH PRIORITY)** — A normal reload currently loads the page without styles because the service worker serves a stale precached `index.html` that references hashed assets removed by the latest deploy. A normal reload must reliably load the current HTML and matching assets.
2. **AI reliability and correctness (HIGH PRIORITY)** — The configured Gemini model name is invalid, requests have no timeout, JSON parsing is fragile, the meal-swap retry strategy is wasteful, raw AI responses are logged in production, and the user-supplied API key must be handled safely.
3. **Mobile UX (look & feel)** — Global mobile CSS fixes, safe-area inset handling for the notch and home indicator, input font sizing to prevent iOS auto-zoom, and bottom-sheet modals with adequate touch targets.

A cross-cutting requirement adds a React Error Boundary so a single thrown error shows a friendly message instead of a blank screen.

### Priority Summary

- **P0 (top priority):** Requirement 1 (PWA refresh fix), Requirement 5 (valid Gemini model name).
- **P1 (high priority):** Requirements 6–10 (AI reliability), Requirement 14 (Error Boundary).
- **P2 (look & feel):** Requirements 2–4, 11–13 (mobile UX and global CSS).

## Glossary

- **Smakołysz**: The diet-planner PWA described in this document.
- **App**: The client-side React application running in the browser, including its UI and state.
- **Service_Worker**: The Workbox-generated service worker produced by `vite-plugin-pwa` that intercepts navigation and asset requests.
- **PWA_Update_Manager**: The App component or module responsible for detecting a new Service_Worker version and coordinating activation/reload (e.g. via `virtual:pwa-register`).
- **Gemini_Client**: The `GeminiClient` class and related functions in `src/ai/geminiClient.ts` that call the Google Gemini API.
- **Gemini_API**: Google's `generativelanguage.googleapis.com` HTTP endpoint.
- **AI_Response**: The text payload returned by the Gemini_API for a generation request.
- **Meal**: A meal object with fields `type`, `title`, `kcal`, `protein`, `carbs`, `fats`, `ingredients`, `instruction`, and optional `tip`.
- **Meal_Swap**: The Gemini_Client operation that replaces an existing Meal with a new Meal of similar caloric content.
- **Kcal_Tolerance_Band**: The inclusive caloric range of ±5% around the original Meal's `kcal` value used to accept a swapped Meal.
- **API_Key**: The user-supplied Google Gemini API key entered in Settings and stored client-side.
- **Safe_Area_Inset**: The `env(safe-area-inset-top|right|bottom|left)` values exposed by the browser on devices with a notch or home indicator.
- **Header**: The sticky top navigation bar rendered by `src/components/Header.tsx`.
- **FAB**: The fixed floating action button (speed dial) rendered in `src/components/DietView.tsx`.
- **Modal**: A dialog component such as `AddMealModal` that overlays the main content.
- **Bottom_Sheet**: A Modal presentation that, on small screens, anchors to the bottom edge of the viewport and slides up.
- **Small_Screen**: A viewport with a CSS width of less than 640px (Tailwind `sm` breakpoint).
- **Error_Boundary**: A React component that catches rendering errors in its descendant tree and renders a fallback UI.
- **Mobile_Input**: Any text or number input element rendered inside a Modal on a Small_Screen.

## Requirements

### Requirement 1: Fresh Assets on Normal Reload (P0)

**User Story:** As a user, I want a normal reload to load the current page with correct styles, so that I do not have to perform a hard refresh after a new deployment.

#### Acceptance Criteria

1. WHEN a user performs a normal reload (a browser-initiated navigation that is not a hard refresh and does not bypass the Service_Worker) after a new deployment, THE App SHALL load an HTML document whose referenced CSS and JavaScript asset URLs all resolve to assets present in the current deployment, with zero references to assets removed by the current deployment.
2. WHEN the App loads the HTML document after a new deployment, THE App SHALL render with its stylesheet fully applied within 5 seconds of navigation start, without requiring a hard refresh.
3. WHILE a network connection is available, THE Service_Worker SHALL serve navigation requests using a network-first strategy that requests the network-current HTML document with a network timeout of 3 seconds, and SHALL return the network response when received within the timeout.
4. IF a referenced CSS or JavaScript asset is absent from the active cache, THEN THE Service_Worker SHALL retrieve the asset from the network and return it to the requesting document.
5. IF the network is unavailable or the navigation request exceeds the 3-second network timeout, THEN THE Service_Worker SHALL serve the most recently cached HTML document (navigateFallback '/index.html') so the App remains loadable offline.

### Requirement 2: Service Worker Update Activation (P0)

**User Story:** As a user, I want the App to apply a new version promptly, so that I always run the latest deployed code.

#### Acceptance Criteria

1. WHEN the PWA_Update_Manager detects a new Service_Worker version, THE PWA_Update_Manager SHALL activate the new Service_Worker and reload the App from the new version within one reload cycle and complete within 5 seconds of detection under normal network conditions.
2. WHILE no offline edits are pending, THE PWA_Update_Manager SHALL apply the new version automatically without requiring any user action other than the single automatic reload.
3. WHILE one or more offline edits are pending, THE PWA_Update_Manager SHALL defer activation of the new Service_Worker version until all pending edits are persisted, and SHALL continue serving the currently active version until then.
4. IF activation of a new Service_Worker version fails, THEN THE App SHALL continue serving the currently active version, SHALL retain all pending user data without loss, and SHALL retry detection on the next reload cycle.

### Requirement 3: Offline Availability (P2)

**User Story:** As a user, I want the App shell to remain available offline, so that the installed PWA still opens without a network connection.

#### Acceptance Criteria

1. WHILE no network connection is available, THE Service_Worker SHALL serve the App shell (HTML document, CSS, JavaScript, and icon assets required to render the initial interactive screen) from cache within 3 seconds of the navigation request.
2. WHEN the App is served from cache offline, THE Service_Worker SHALL serve only asset versions whose cache version identifier matches the cache version identifier of the cached HTML document.
3. IF an asset version consistent with the cached HTML document is not present in the cache, THEN THE Service_Worker SHALL serve the most recent complete and mutually consistent cached App shell version and SHALL NOT serve a mixed set of asset versions.
4. IF no complete App shell exists in cache while no network connection is available, THEN THE Service_Worker SHALL return an offline fallback response indicating that the App is unavailable offline, while preserving any existing cached data.

### Requirement 4: Deployment Cache Headers (P1)

**User Story:** As a maintainer, I want cache headers aligned with the update strategy, so that browsers and the service worker do not retain stale entry points.

#### Acceptance Criteria

1. THE App deployment configuration SHALL set a Cache-Control directive of `no-cache, no-store, must-revalidate` on the HTML entry document served at the `/index.html` path.
2. THE App deployment configuration SHALL set a Cache-Control directive of `public, max-age=31536000, immutable`, equivalent to a 31,536,000-second (365-day) maximum age, on all hashed files matched under the `/assets/` path.
3. THE App deployment configuration SHALL set a Cache-Control directive of `no-cache` on the Service_Worker script served at the `/sw.js` path.
4. IF a deployed response for the `/index.html` or `/sw.js` path returns a Cache-Control header that permits caching (any value other than the specified no-cache directives), THEN THE App deployment configuration SHALL be treated as failing the cache-header validation.
5. IF a deployed response for any file under the `/assets/` path returns a Cache-Control max-age value of less than 31,536,000 seconds or omits the `immutable` directive, THEN THE App deployment configuration SHALL be treated as failing the cache-header validation.

### Requirement 5: Valid Gemini Model Name (P0)

**User Story:** As a user, I want AI features to call a supported model, so that AI requests succeed instead of failing with model errors.

#### Acceptance Criteria

1. THE Gemini_Client SHALL issue requests using a model name that is present in Google's documented list of supported Gemini models, and SHALL NOT use a model identifier that is absent from that documented list.
2. IF the Gemini_API rejects a request because the model name is invalid or unsupported, THEN THE Gemini_Client SHALL return a result whose success indicator is false, without meal data, SHALL stop retrying, and SHALL include an error message in Polish identifying an invalid model configuration.
3. IF the Gemini_API rejects a request because the API_Key is invalid or unauthorized, THEN THE Gemini_Client SHALL return a result whose success indicator is false, without meal data, SHALL stop retrying, and SHALL include an error message in Polish identifying an invalid API key.
4. IF no API_Key is configured or the configured API_Key is empty, THEN THE Gemini_Client SHALL return a result whose success indicator is false and SHALL include an error message in Polish indicating that an API key is required, without issuing a request to the Gemini_API.
5. IF any Gemini_Client request fails for any reason, THEN THE App SHALL leave the existing meal plan data unchanged.

### Requirement 6: Bounded AI Request Timeout (P1)

**User Story:** As a user, I want AI requests to time out, so that a hung request does not leave the UI waiting indefinitely.

#### Acceptance Criteria

1. WHEN the Gemini_Client sends a request to the Gemini_API, THE Gemini_Client SHALL start a timeout timer set to a configured value between 1 second and 30 seconds inclusive, defaulting to 30 seconds when no value is configured.
2. WHILE a request to the Gemini_API is in progress, IF no response is received before the configured timeout elapses, THEN THE Gemini_Client SHALL abort the request and SHALL return a result indicating a timeout, with the timeout message text in Polish.
3. IF a request to the Gemini_API is aborted due to timeout, THEN THE Gemini_Client SHALL discard any partial response data and SHALL NOT return partial results.
4. WHEN a request to the Gemini_API completes successfully or is aborted due to timeout, THE App SHALL clear the in-progress loading state associated with that request within 1 second of the completion or abort.

### Requirement 7: Structured JSON Output (P1)

**User Story:** As a user, I want AI responses to be valid structured data, so that meals are parsed reliably instead of failing with a processing error.

#### Acceptance Criteria

1. WHEN the Gemini_Client requests Meal data, THE Gemini_Client SHALL request structured output by setting `responseMimeType` to `application/json` and supplying a `responseSchema` that declares the required fields `type`, `title`, `kcal`, `protein`, `carbs`, `fats`, `ingredients`, and `instruction`, plus the optional field `tip`.
2. WHEN the Gemini_API returns a structured AI_Response, THE Gemini_Client SHALL parse the AI_Response as JSON in a single direct parse step, without applying fallback text-extraction strategies.
3. WHEN the Gemini_Client validates a parsed Meal, THE Gemini_Client SHALL require that `type` is one of the five recognized MealType values, that `title` and `instruction` are non-empty strings, that `kcal`, `protein`, `carbs`, and `fats` are finite numbers greater than or equal to 0, and that `ingredients` is a non-empty array of strings.
4. WHERE a parsed Meal includes a `tip` field, THE Gemini_Client SHALL require that `tip` is a string.
5. IF the AI_Response cannot be parsed as JSON, or the parsed data fails Meal validation, THEN THE Gemini_Client SHALL return a result whose success indicator is false with an error message in Polish indicating a processing failure, without adding or modifying any Meal.

### Requirement 8: Efficient and Predictable Meal Swap (P1)

**User Story:** As a user, I want a meal swap to stay close to the original calories without excessive delay, so that swapping is fast and predictable.

#### Acceptance Criteria

1. WHEN a Meal_Swap is requested and a valid candidate Meal whose `kcal` value lies within the Kcal_Tolerance_Band (greater than or equal to 95% and less than or equal to 105% of the original Meal's `kcal` value) is produced, THE Gemini_Client SHALL return that candidate Meal and SHALL stop issuing further requests to the Gemini_API.
2. THE Gemini_Client SHALL issue no fewer than 1 and no more than 4 requests to the Gemini_API for a single Meal_Swap.
3. IF no valid candidate Meal lands within the Kcal_Tolerance_Band after all issued requests (up to 4) complete, THEN THE Gemini_Client SHALL return the valid candidate Meal whose absolute difference between its `kcal` value and the original Meal's `kcal` value is the smallest among all candidates produced.
4. IF two or more valid candidate Meals share the smallest absolute `kcal` difference from the original Meal, THEN THE Gemini_Client SHALL return the candidate Meal that was produced earliest among them.
5. IF no valid candidate Meal is produced during a Meal_Swap after all issued requests (up to 4) complete, THEN THE Gemini_Client SHALL return a result whose success indicator is false and that contains an error message in Polish indicating that AI processing failed, without modifying the original Meal.

### Requirement 9: No Production Logging of AI Responses (P1)

**User Story:** As a maintainer, I want raw AI responses kept out of production logs, so that response content is not exposed in the browser console.

#### Acceptance Criteria

1. WHILE the App runs in a production build (where `import.meta.env.DEV` evaluates to `false`), THE Gemini_Client SHALL NOT emit raw AI_Response content, or any substring or truncated portion thereof, to the browser console through any console method (including `console.log`, `console.warn`, `console.error`, `console.info`, and `console.debug`).
2. WHERE the App runs in a development build (where `import.meta.env.DEV` evaluates to `true`), THE Gemini_Client SHALL be permitted to log raw AI_Response content to the browser console.
3. IF the `import.meta.env.DEV` flag is undefined or cannot be evaluated at runtime, THEN THE Gemini_Client SHALL default to the production behavior and suppress all logging of raw AI_Response content to the browser console.
4. WHILE the App runs in a production build, WHEN the Gemini_Client logs operational diagnostic messages that do not contain AI_Response content (such as retry attempts or HTTP status notices), THE Gemini_Client SHALL be permitted to emit those messages to the browser console.

### Requirement 10: Safe API Key Handling (P1)

**User Story:** As a user, I want my Gemini API key handled safely, so that my personal key is protected.

#### Acceptance Criteria

1. WHEN a user saves a non-empty API_Key in Settings, THE App SHALL store the API_Key in the user's own Firestore-backed profile data.
2. THE App SHALL transmit the API_Key only to the Gemini_API endpoint and SHALL NOT transmit the API_Key to any other third-party endpoint.
3. WHEN the App displays the API_Key in Settings, THE App SHALL replace every character of the API_Key value with a uniform masking character such that no original character of the API_Key is visible by default.
4. THE Gemini_Client SHALL exclude the API_Key value from any error message returned to the App.
5. IF a user attempts to save an empty API_Key in Settings, THEN THE App SHALL reject the save, retain any previously stored API_Key value unchanged, and display an error message indicating that an API_Key is required.
6. IF storing the API_Key to the user's Firestore-backed profile data fails, THEN THE App SHALL retain the previously stored API_Key value unchanged and display an error message indicating that the save did not complete.
7. WHERE the user activates the reveal control for the API_Key in Settings, THE App SHALL display the API_Key in plain text until the user deactivates the reveal control or navigates away from Settings.

### Requirement 11: Global Mobile CSS Baseline (P2)

**User Story:** As a mobile user, I want a polished baseline feel, so that tapping and scrolling behave naturally on touch devices.

#### Acceptance Criteria

1. THE App global stylesheet SHALL set `-webkit-tap-highlight-color` to a fully transparent value (zero alpha) for all interactive elements, including links, buttons, and elements with click or tap handlers.
2. WHEN a user taps an interactive element on a touch device, THE App SHALL display no visible default tap-highlight overlay color.
3. THE App global stylesheet SHALL set `overscroll-behavior` on the root scroll container to a value that prevents both vertical and horizontal scroll chaining to parent or browser-level scroll containers.
4. WHEN a user scrolls past the top or bottom boundary of the root scroll container, THE App SHALL prevent the scroll action from propagating to any ancestor scroll container or triggering browser-level overscroll navigation.
5. THE App global stylesheet SHALL define safe-area inset support for all four edges (top, right, bottom, left) using the environment-provided safe-area-inset values so that layout content is offset from device cutouts and rounded corners.

### Requirement 12: Safe-Area Inset Handling (P2)

**User Story:** As a user on a device with a notch or home indicator, I want fixed UI elements to avoid the cutouts, so that the Header and FAB remain fully visible and tappable.

#### Acceptance Criteria

1. THE App `index.html` viewport meta tag SHALL include `viewport-fit=cover`.
2. WHILE the App runs as an installed standalone PWA on a device exposing a top Safe_Area_Inset greater than 0 pixels, THE Header SHALL position its top edge offset from the viewport top by the sum of its base top position and the top Safe_Area_Inset value, such that no part of the Header is occluded by the notch.
3. WHILE the App runs on a device exposing a bottom Safe_Area_Inset greater than 0 pixels, THE FAB SHALL position its bottom edge offset from the viewport bottom by the sum of its base bottom position and the bottom Safe_Area_Inset value, such that the FAB remains fully tappable above the home indicator.
4. WHILE the App runs on a device exposing a bottom Safe_Area_Inset greater than 0 pixels, THE main content area SHALL include bottom padding of at least the bottom Safe_Area_Inset value, such that no content is occluded by the home indicator.
5. IF the device or browser does not expose Safe_Area_Inset values, or exposes a Safe_Area_Inset value of 0 pixels, THEN THE App SHALL render the Header, FAB, and main content area at their base positions with no added safe-area offset, preserving full visibility and tappability.

### Requirement 13: Mobile-Friendly Modals and Touch Targets (P2)

**User Story:** As a mobile user, I want modals and inputs sized for touch, so that I can fill forms without the screen zooming or mis-tapping controls.

#### Acceptance Criteria

1. WHILE the App is displayed on a Small_Screen (viewport width below 640px), THE Modal SHALL be presented as a Bottom_Sheet anchored to the bottom edge of the viewport and spanning the full viewport width.
2. WHILE the App is displayed on a viewport at or above 640px width, THE Modal SHALL be presented as a horizontally and vertically centered dialog.
3. WHILE the App is displayed on a Small_Screen, THE Mobile_Input SHALL render with a computed font size of at least 16px so that the viewport does not auto-zoom on focus.
4. THE interactive controls within a Modal SHALL each present a touch target of at least 44px in width and at least 44px in height.
5. WHEN a Bottom_Sheet begins opening, THE App SHALL animate it sliding upward from the bottom edge into its final position over a duration between 150ms and 400ms.
6. WHEN a Bottom_Sheet begins closing, THE App SHALL animate it sliding downward out of the viewport over a duration between 150ms and 400ms.
7. IF a Bottom_Sheet's content height exceeds the available viewport height, THEN THE App SHALL constrain the Bottom_Sheet to the viewport height and make its content area vertically scrollable.

### Requirement 14: Application Error Boundary (P1)

**User Story:** As a user, I want a friendly message when something breaks, so that I do not see a blank white screen.

#### Acceptance Criteria

1. WHEN a descendant component throws an error during rendering or within a React lifecycle method, THE Error_Boundary SHALL catch the error and render a fallback view written in Polish that contains a heading and an explanatory message, instead of leaving a blank screen.
2. WHEN the Error_Boundary renders the fallback view, THE Error_Boundary SHALL present a single reload control labeled in Polish.
3. WHEN the user activates the reload control, THE Error_Boundary SHALL reload the App and clear the displayed fallback view.
4. THE Error_Boundary SHALL wrap the App's entire root component tree so that an error thrown by any descendant component is caught.
5. WHILE the App runs in a development build, THE Error_Boundary SHALL display the caught error's message and component stack trace within the fallback view.
6. WHILE the App runs in a production build, THE Error_Boundary SHALL NOT display the caught error's message or component stack trace within the fallback view.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  clampTimeout,
  maskApiKey,
  MIN_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MASK_CHAR,
} from './geminiLogic';

// Feature: app-improvements, Property 9: Timeout value is clamped to the valid range
describe('Property 9: Timeout value is clamped to the valid range', () => {
  it('clamps any configured timeout into [MIN_TIMEOUT_MS, MAX_TIMEOUT_MS]', () => {
    fc.assert(
      fc.property(
        // Mix of out-of-range, in-range, and non-finite numeric inputs.
        fc.oneof(
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          fc.double(),
          fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        ),
        (input) => {
          const result = clampTimeout(input);
          expect(result).toBeGreaterThanOrEqual(MIN_TIMEOUT_MS);
          expect(result).toBeLessThanOrEqual(MAX_TIMEOUT_MS);
          // In-range finite inputs pass through unchanged.
          if (Number.isFinite(input) && input >= MIN_TIMEOUT_MS && input <= MAX_TIMEOUT_MS) {
            expect(result).toBe(input);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('resolves an unconfigured timeout (undefined) to 30000 ms', () => {
    expect(clampTimeout(undefined)).toBe(30000);
    expect(clampTimeout(undefined)).toBe(MAX_TIMEOUT_MS);
  });
});

// Feature: app-improvements, Property 12: API key masking hides every original character
describe('Property 12: API key masking hides every original character', () => {
  it('returns a same-length string of only the mask character, hiding originals', () => {
    fc.assert(
      fc.property(fc.string(), (key) => {
        const masked = maskApiKey(key);

        // Same length as the input.
        expect(masked.length).toBe(key.length);

        // Composed solely of the uniform mask character.
        for (const ch of masked) {
          expect(ch).toBe(MASK_CHAR);
        }

        // None of the original characters is visible, unless that character
        // happens to be the mask character itself.
        for (const ch of key) {
          if (ch !== MASK_CHAR) {
            expect(masked).not.toContain(ch);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

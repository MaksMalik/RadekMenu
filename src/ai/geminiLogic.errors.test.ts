// Feature: app-improvements, Property 6: Fatal Gemini errors stop retrying with a Polish message
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { classifyGeminiError, errorMessage } from './geminiLogic';

/**
 * Property 6: Fatal Gemini errors stop retrying with a Polish message.
 *
 * For any Gemini_API rejection caused by an invalid/unsupported model or an
 * invalid/unauthorized API key, `classifyGeminiError(status, body)` returns the
 * corresponding fatal kind (`invalid_model` / `invalid_key`), and the
 * `errorMessage` for that kind is a non-empty Polish string that identifies the
 * cause.
 *
 * Validates: Requirements 5.2, 5.3
 */

// Phrases that the classifier treats as an invalid/unauthorized key signal.
const INVALID_KEY_BODY_PHRASES = [
  'API key not valid',
  'API_KEY_INVALID',
  'invalid API key',
  'invalid authentication',
  'permission denied',
  'unauthenticated',
];

// Problem words that, combined with "model", indicate an unsupported/unknown model.
const MODEL_PROBLEM_PHRASES = [
  'not found',
  'not supported',
  'is not found',
  'unsupported',
  'does not exist',
  'was not found',
];

// A non-empty Polish message must contain at least one Polish-specific letter
// or a recognizable Polish keyword. Used to assert messages are localized.
function looksPolish(message: string): boolean {
  return /[ąćęłńóśźż]/i.test(message) || /\b(klucz|model|modelu|nieprawidłow)/i.test(message);
}

describe('Property 6: Fatal Gemini errors stop retrying with a Polish message', () => {
  it('classifies invalid/unauthorized API key responses as invalid_key with a Polish message', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Variant A: unauthorized HTTP status (401/403) with an arbitrary body.
          fc.record({
            status: fc.constantFrom(401, 403),
            body: fc.string(),
          }),
          // Variant B: a non-transient/non-auth status (or none) with a body
          // that carries an invalid-key signal.
          fc.record({
            status: fc.constantFrom(undefined, 400, 404, 500),
            body: fc
              .tuple(
                fc.string(),
                fc.constantFrom(...INVALID_KEY_BODY_PHRASES),
                fc.string(),
              )
              .map(([pre, phrase, post]) => `${pre} ${phrase} ${post}`),
          }),
        ),
        ({ status, body }) => {
          const kind = classifyGeminiError(status, body);
          expect(kind).toBe('invalid_key');

          const message = errorMessage(kind);
          // Non-empty Polish message that identifies the cause (the API key).
          expect(message.length).toBeGreaterThan(0);
          expect(looksPolish(message)).toBe(true);
          expect(message.toLowerCase()).toContain('klucz');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('classifies invalid/unsupported model responses as invalid_model with a Polish message', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: fc.constantFrom(400, 404),
          name: fc
            .string({ minLength: 1 })
            .filter((s) => !/[\u0000-\u001f]/.test(s)),
          problem: fc.constantFrom(...MODEL_PROBLEM_PHRASES),
        }),
        ({ status, name, problem }) => {
          // Bodies mention "model" plus a problem word, mirroring the Gemini API
          // shape for unknown/unsupported models.
          const body = `The requested model ${name} ${problem}.`;
          const kind = classifyGeminiError(status, body);
          expect(kind).toBe('invalid_model');

          const message = errorMessage(kind);
          // Non-empty Polish message that identifies the cause (the model).
          expect(message.length).toBeGreaterThan(0);
          expect(looksPolish(message)).toBe(true);
          expect(message.toLowerCase()).toContain('model');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('produces distinct, non-empty fatal messages for invalid_key and invalid_model', () => {
    const keyMessage = errorMessage('invalid_key');
    const modelMessage = errorMessage('invalid_model');
    expect(keyMessage).not.toBe('');
    expect(modelMessage).not.toBe('');
    expect(keyMessage).not.toBe(modelMessage);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateCacheHeaders } from '../utils/cacheHeaderValidator';
import { DEFAULT_MODEL, SUPPORTED_MODELS } from '../ai/geminiLogic';

/**
 * Config validation tests for cache headers (Requirements 4.1–4.5) and
 * model id (Requirement 5.1).
 */

// Load and parse vercel.json
const vercelJsonPath = resolve(__dirname, '../../vercel.json');
const vercelConfig = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));

/**
 * Helper: extract the Cache-Control value for a given source path from vercel.json headers.
 */
function getCacheControl(source: string): string | undefined {
  const entry = vercelConfig.headers.find(
    (h: { source: string; headers: { key: string; value: string }[] }) => h.source === source
  );
  if (!entry) return undefined;
  const header = entry.headers.find(
    (h: { key: string; value: string }) => h.key === 'Cache-Control'
  );
  return header?.value;
}

describe('vercel.json cache headers (Requirements 4.1–4.3)', () => {
  it('4.1: /index.html has Cache-Control "no-cache, no-store, must-revalidate"', () => {
    const value = getCacheControl('/index.html');
    expect(value).toBe('no-cache, no-store, must-revalidate');
  });

  it('4.2: /assets/(.*) has Cache-Control "public, max-age=31536000, immutable"', () => {
    const value = getCacheControl('/assets/(.*)');
    expect(value).toBe('public, max-age=31536000, immutable');
  });

  it('4.3: /sw.js has Cache-Control "no-cache"', () => {
    const value = getCacheControl('/sw.js');
    expect(value).toBe('no-cache');
  });
});

describe('validateCacheHeaders predicate (Requirements 4.4, 4.5)', () => {
  it('4.1–4.3: valid config passes validation', () => {
    const result = validateCacheHeaders([
      { path: '/index.html', cacheControl: 'no-cache, no-store, must-revalidate' },
      { path: '/assets/(.*)', cacheControl: 'public, max-age=31536000, immutable' },
      { path: '/sw.js', cacheControl: 'no-cache' },
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('4.4: permissive /index.html header fails validation', () => {
    const result = validateCacheHeaders([
      { path: '/index.html', cacheControl: 'public, max-age=3600' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('/index.html');
  });

  it('4.4: permissive /sw.js header fails validation', () => {
    const result = validateCacheHeaders([
      { path: '/sw.js', cacheControl: 'public, max-age=3600' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('/sw.js');
  });

  it('4.5: asset with short max-age fails validation', () => {
    const result = validateCacheHeaders([
      { path: '/assets/(.*)', cacheControl: 'public, max-age=100, immutable' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('max-age');
  });

  it('4.5: asset without immutable fails validation', () => {
    const result = validateCacheHeaders([
      { path: '/assets/(.*)', cacheControl: 'public, max-age=31536000' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('immutable');
  });
});

describe('DEFAULT_MODEL membership (Requirement 5.1)', () => {
  it('5.1: DEFAULT_MODEL is a member of SUPPORTED_MODELS', () => {
    expect(SUPPORTED_MODELS).toContain(DEFAULT_MODEL);
  });
});

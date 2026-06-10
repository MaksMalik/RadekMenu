/**
 * Cache-header validation predicate for deployment configuration.
 *
 * Validates that:
 * - /index.html has Cache-Control: no-cache, no-store, must-revalidate
 * - /sw.js has Cache-Control: no-cache
 * - /assets/* entries have Cache-Control with immutable and max-age=31536000
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export interface CacheHeaderEntry {
  path: string;
  cacheControl: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_ENTRY_HEADER = 'no-cache, no-store, must-revalidate';
const REQUIRED_SW_HEADER = 'no-cache';
const MIN_ASSET_MAX_AGE = 31536000;

/**
 * Returns true if the path matches the entry document (index.html).
 */
function isEntryPath(path: string): boolean {
  return path === '/index.html' || path === 'index.html';
}

/**
 * Returns true if the path matches the service worker script.
 */
function isSwPath(path: string): boolean {
  return path === '/sw.js' || path === 'sw.js';
}

/**
 * Returns true if the path matches an asset under /assets/.
 */
function isAssetPath(path: string): boolean {
  return (
    path.startsWith('/assets/') ||
    path.startsWith('assets/') ||
    path === '/assets/(.*)' ||
    path === '/assets/*'
  );
}

/**
 * Parses the max-age value from a Cache-Control header string.
 * Returns undefined if no max-age directive is present.
 */
function parseMaxAge(cacheControl: string): number | undefined {
  const match = cacheControl.match(/max-age=(\d+)/i);
  if (!match) return undefined;
  return parseInt(match[1], 10);
}

/**
 * Validates an array of cache header entries against deployment requirements.
 *
 * Rules:
 * - /index.html must have Cache-Control exactly "no-cache, no-store, must-revalidate"
 * - /sw.js must have Cache-Control exactly "no-cache"
 * - /assets/* entries must include "immutable" and have max-age >= 31536000
 *
 * Any permissive caching on entry/sw paths or missing immutable/short max-age
 * on asset paths produces validation errors.
 */
export function validateCacheHeaders(
  config: CacheHeaderEntry[]
): ValidationResult {
  const errors: string[] = [];

  for (const entry of config) {
    const { path, cacheControl } = entry;

    if (isEntryPath(path)) {
      if (cacheControl !== REQUIRED_ENTRY_HEADER) {
        errors.push(
          `/index.html must have Cache-Control "${REQUIRED_ENTRY_HEADER}", got "${cacheControl}"`
        );
      }
    } else if (isSwPath(path)) {
      if (cacheControl !== REQUIRED_SW_HEADER) {
        errors.push(
          `/sw.js must have Cache-Control "${REQUIRED_SW_HEADER}", got "${cacheControl}"`
        );
      }
    } else if (isAssetPath(path)) {
      if (!cacheControl.includes('immutable')) {
        errors.push(
          `Asset path "${path}" must include "immutable" in Cache-Control, got "${cacheControl}"`
        );
      }

      const maxAge = parseMaxAge(cacheControl);
      if (maxAge === undefined || maxAge < MIN_ASSET_MAX_AGE) {
        errors.push(
          `Asset path "${path}" must have max-age >= ${MIN_ASSET_MAX_AGE}, got "${cacheControl}"`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

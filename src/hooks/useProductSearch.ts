import { useState, useRef, useEffect, useCallback } from 'react';
import { searchProducts } from '../services/productSearchService';
import type { OFFProduct } from '../types/openfoodfacts';

export interface UseProductSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: OFFProduct[];
  loading: boolean;
  error: string | null;
}

/**
 * Encapsulates debounced search logic with abort controller management.
 * - Debounces 300ms after last keystroke
 * - Cancels in-flight requests when new search initiated
 * - Aborts after 10s timeout
 * - Clears results when query is empty or < 2 chars
 */
export function useProductSearch(): UseProductSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Clear results if query is too short
    if (query.trim().length < 2) {
      cleanup();
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any previous pending work
    cleanup();
    setLoading(true);
    setError(null);

    // Debounce for 300ms
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Set up 10s timeout
      timeoutTimerRef.current = setTimeout(() => {
        controller.abort();
      }, 10000);

      try {
        const products = await searchProducts(query.trim(), {
          signal: controller.signal,
        });
        // Only update state if this request wasn't aborted
        if (!controller.signal.aborted) {
          setResults(products);
          setError(null);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // Check if it was our timeout
          if (timeoutTimerRef.current === null) {
            setError('Wyszukiwanie trwało zbyt długo. Spróbuj ponownie.');
          }
        } else {
          setError('Nie udało się połączyć. Sprawdź połączenie internetowe.');
        }
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        } else {
          // If it was aborted by timeout (not by new query), stop loading
          if (timeoutTimerRef.current === null) {
            setLoading(false);
          }
        }
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
      }
    }, 300);

    return cleanup;
  }, [query, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { query, setQuery, results, loading, error };
}

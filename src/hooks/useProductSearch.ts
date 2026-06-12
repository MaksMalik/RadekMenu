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
 * - Cancels in-flight requests when new search initiated (NO error shown)
 * - Aborts after 10s timeout (shows timeout error)
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
  const isTimeoutAbortRef = useRef(false);

  const cancelPreviousRequest = useCallback(() => {
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
    isTimeoutAbortRef.current = false;
  }, []);

  useEffect(() => {
    // Clear results if query is too short
    if (query.trim().length < 2) {
      cancelPreviousRequest();
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancel any previous pending work — this does NOT cause an error
    cancelPreviousRequest();
    setError(null);
    setLoading(true);

    // Debounce for 300ms
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isTimeoutAbortRef.current = false;

      // Set up 10s timeout
      timeoutTimerRef.current = setTimeout(() => {
        isTimeoutAbortRef.current = true;
        controller.abort();
      }, 10000);

      try {
        const products = await searchProducts(query.trim(), {
          signal: controller.signal,
        });

        // Only update state if this controller is still the active one
        if (abortControllerRef.current === controller) {
          setResults(products);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        // Only handle errors for the CURRENT active controller
        if (abortControllerRef.current !== controller) {
          // This request was superseded by a new one — silently ignore
          return;
        }

        if (controller.signal.aborted) {
          if (isTimeoutAbortRef.current) {
            // Timeout — show timeout error
            setError('Wyszukiwanie trwało zbyt długo. Spróbuj ponownie.');
            setResults([]);
            setLoading(false);
          }
          // If aborted but NOT timeout, it was cancelled by new query — do nothing
        } else {
          // Actual network/fetch error
          const message = (err instanceof Error && err.message === 'NETWORK_ERROR')
            ? 'Nie udało się połączyć. Sprawdź połączenie internetowe.'
            : 'Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie.';
          setError(message);
          setResults([]);
          setLoading(false);
        }
      } finally {
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
      }
    }, 300);

    return () => {
      cancelPreviousRequest();
    };
  }, [query, cancelPreviousRequest]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPreviousRequest();
    };
  }, [cancelPreviousRequest]);

  return { query, setQuery, results, loading, error };
}

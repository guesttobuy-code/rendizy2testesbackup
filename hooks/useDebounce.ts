import { useState, useEffect } from 'react';

/**
 * Hook for debouncing values
 * Útil para buscas e inputs que disparam muitas re-renderizações
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timeout para atualizar o valor após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancela o timeout se value mudar antes do delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

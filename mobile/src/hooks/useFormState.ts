import { useState, useCallback } from 'react';

interface FormState {
  isLoading: boolean;
  error: string | null;
}

export function useFormState() {
  const [state, setState] = useState<FormState>({
    isLoading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    clearError,
  };
} 
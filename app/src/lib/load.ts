import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data when the screen gains focus; `reload` for pull-to-refresh. */
export function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await fnRef.current()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return { data, error, loading, reload };
}

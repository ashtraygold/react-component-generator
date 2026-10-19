import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { loadStored, saveStored } from '../utils/storage';

/** useState처럼 쓰되, 값이 바뀔 때마다 localStorage에 저장하고 마운트 시 복원한다. */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  parse?: (raw: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => loadStored(key, fallback, parse));

  useEffect(() => {
    saveStored(key, value);
  }, [key, value]);

  return [value, setValue];
}

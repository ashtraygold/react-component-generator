import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { loadStored, saveStored, type StorageKind } from '../utils/storage';

/** useState처럼 쓰되, 값이 바뀔 때마다 저장하고 마운트 시 복원한다. kind로 localStorage/sessionStorage를 고른다. */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  parse?: (raw: unknown) => T,
  kind: StorageKind = 'local',
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => loadStored(key, fallback, parse, kind));

  useEffect(() => {
    saveStored(key, value, kind);
  }, [key, value, kind]);

  return [value, setValue];
}

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

  // localStorage는 탭 간에 공유되므로, 다른 탭의 변경을 받아 서로 덮어쓰지 않게 한다.
  // sessionStorage는 탭마다 독립이라 동기화하지 않는다.
  useEffect(() => {
    if (kind !== 'local') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(loadStored(key, fallback, parse, kind));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // fallback·parse는 호출 때마다 새로 만들어질 수 있어 의존성에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, kind]);

  useEffect(() => {
    saveStored(key, value, kind);
  }, [key, value, kind]);

  return [value, setValue];
}

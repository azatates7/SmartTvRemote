import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { parsePrivateIPv4, type IpValidationError } from '@/domain/ip-address';
import type { SavedTv } from '@/domain/tv';

import { loadSavedTvs, writeSavedTvs } from './saved-tv-storage';

export const MAX_TV_NAME_LENGTH = 40;

export type AddTvResult = { ok: true } | { ok: false; error: IpValidationError | 'duplicate' };

type SavedTvsState = {
  status: 'loading' | 'ready';
  tvs: readonly SavedTv[];
  /** True if the last read or write to device storage failed. */
  storageError: boolean;
  addTv: (name: string, ipInput: string) => AddTvResult;
  removeTv: (id: string) => void;
};

const SavedTvsContext = createContext<SavedTvsState | null>(null);

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SavedTvsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SavedTvsState['status']>('loading');
  const [tvs, setTvs] = useState<readonly SavedTv[]>([]);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let active = true;
    loadSavedTvs()
      .then((loaded) => {
        if (active) setTvs(loaded);
      })
      .catch(() => {
        if (active) setStorageError(true);
      })
      .finally(() => {
        if (active) setStatus('ready');
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: readonly SavedTv[]) => {
    setTvs(next);
    writeSavedTvs(next)
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  }, []);

  const addTv = useCallback(
    (name: string, ipInput: string): AddTvResult => {
      const ip = parsePrivateIPv4(ipInput);
      if (!ip.ok) return { ok: false, error: ip.error };
      if (tvs.some((tv) => tv.ipAddress === ip.value)) return { ok: false, error: 'duplicate' };

      const trimmed = name.trim().slice(0, MAX_TV_NAME_LENGTH);
      persist([
        ...tvs,
        { id: createId(), name: trimmed || `TV ${ip.value}`, ipAddress: ip.value, addedAt: Date.now() },
      ]);
      return { ok: true };
    },
    [tvs, persist],
  );

  const removeTv = useCallback(
    (id: string) => persist(tvs.filter((tv) => tv.id !== id)),
    [tvs, persist],
  );

  const value = useMemo(
    () => ({ status, tvs, storageError, addTv, removeTv }),
    [status, tvs, storageError, addTv, removeTv],
  );

  return <SavedTvsContext.Provider value={value}>{children}</SavedTvsContext.Provider>;
}

export function useSavedTvs() {
  const ctx = useContext(SavedTvsContext);
  if (!ctx) throw new Error('useSavedTvs must be used inside SavedTvsProvider');
  return ctx;
}
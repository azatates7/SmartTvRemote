import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { parsePrivateIPv4, type IpValidationError } from '@/domain/ip-address';
import { planAddTv } from '@/domain/saved-tvs';
import type { DeviceIdentity, SavedTv } from '@/domain/tv';

import { loadSavedTvs, writeSavedTvs } from './saved-tv-storage';

export const MAX_TV_NAME_LENGTH = 40;

export type AddTvResult =
  /** `updated` is set when the TV was already saved (same identity) and only its address changed. */
  | { ok: true; updated?: SavedTv }
  | { ok: false; error: IpValidationError | 'duplicate' };

export type TvPatch = Partial<Pick<SavedTv, 'ipAddress' | 'deviceId' | 'model'>>;

type SavedTvsState = {
  status: 'loading' | 'ready';
  tvs: readonly SavedTv[];
  /** True if the last read or write to device storage failed. */
  storageError: boolean;
  addTv: (name: string, ipInput: string, identity?: DeviceIdentity | null) => AddTvResult;
  /** Updates the address / identity of a saved TV. Returns the updated TV, or null if not found. */
  updateTv: (id: string, patch: TvPatch) => SavedTv | null;
  /** Latest list, safe to read from async code (avoids stale closures). */
  getTvs: () => readonly SavedTv[];
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
  const tvsRef = useRef<readonly SavedTv[]>([]);

  useEffect(() => {
    let active = true;
    loadSavedTvs()
      .then((loaded) => {
        if (!active) return;
        tvsRef.current = loaded;
        setTvs(loaded);
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
    tvsRef.current = next;
    setTvs(next);
    writeSavedTvs(next)
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  }, []);

  const updateTv = useCallback(
    (id: string, patch: TvPatch): SavedTv | null => {
      if (patch.ipAddress !== undefined) {
        const ip = parsePrivateIPv4(patch.ipAddress);
        if (!ip.ok) return null;
        patch = { ...patch, ipAddress: ip.value };
      }
      const current = tvsRef.current;
      const existing = current.find((tv) => tv.id === id);
      if (!existing) return null;
      const updated: SavedTv = { ...existing, ...patch };
      persist(current.map((tv) => (tv.id === id ? updated : tv)));
      return updated;
    },
    [persist],
  );

  const addTv = useCallback(
    (name: string, ipInput: string, identity?: DeviceIdentity | null): AddTvResult => {
      const ip = parsePrivateIPv4(ipInput);
      if (!ip.ok) return { ok: false, error: ip.error };

      const plan = planAddTv({
        current: tvsRef.current,
        name,
        ipAddress: ip.value,
        identity,
        maxNameLength: MAX_TV_NAME_LENGTH,
        newId: createId(),
        now: Date.now(),
      });

      switch (plan.kind) {
        case 'update': {
          // Same physical TV already saved (identity match): only its address changed.
          const updated = updateTv(plan.id, plan.patch);
          return updated ? { ok: true, updated } : { ok: false, error: 'invalidFormat' };
        }
        case 'duplicate':
          return { ok: false, error: 'duplicate' };
        case 'add':
          persist([...tvsRef.current, plan.tv]);
          return { ok: true };
      }
    },
    [persist, updateTv],
  );

  const removeTv = useCallback(
    (id: string) => persist(tvsRef.current.filter((tv) => tv.id !== id)),
    [persist],
  );

  const getTvs = useCallback(() => tvsRef.current, []);

  const value = useMemo(
    () => ({ status, tvs, storageError, addTv, updateTv, getTvs, removeTv }),
    [status, tvs, storageError, addTv, updateTv, getTvs, removeTv],
  );

  return <SavedTvsContext.Provider value={value}>{children}</SavedTvsContext.Provider>;
}

export function useSavedTvs() {
  const ctx = useContext(SavedTvsContext);
  if (!ctx) throw new Error('useSavedTvs must be used inside SavedTvsProvider');
  return ctx;
}
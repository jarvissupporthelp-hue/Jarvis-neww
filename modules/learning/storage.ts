"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

const changed = "jarvis-learning-change";
function subscribe(callback: () => void) {
  window.addEventListener(changed, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changed, callback);
    window.removeEventListener("storage", callback);
  };
}

// An unresolved session has no storage access.
export const LearningOwner = createContext<string | null>(null);

export function clearLearningCache(owner: string) {
  const prefix = "jarvis-learning-v2:" + owner + ":";
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  }
  window.dispatchEvent(new Event(changed));
}

export function useLearningData<T>(key: string, initial: T) {
  const fallback = JSON.stringify(initial);
  const owner = useContext(LearningOwner);
  const name = `jarvis-learning-v2:${owner}:${key}`;
  const storage = () => owner === "guest" ? sessionStorage : localStorage;
  const value = useSyncExternalStore(subscribe, () => owner ? storage().getItem(name) ?? fallback : fallback, () => fallback);
  const save = useCallback((next: T) => {
    if (!owner) return;
    (owner === "guest" ? sessionStorage : localStorage).setItem(name, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
  }, [name, owner]);
  return [JSON.parse(value) as T, save] as const;
}

export const field = "rounded-lg border border-[var(--stroke)] bg-[var(--panel-raised)] px-3 py-2 text-[var(--text)]";
export const button = "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5338b2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#49319e] disabled:opacity-50";

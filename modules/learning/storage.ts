"use client";

import { useCallback, useSyncExternalStore } from "react";

const changed = "jarvis-learning-change";
function subscribe(callback: () => void) {
  window.addEventListener(changed, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changed, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLearningData<T>(key: string, initial: T) {
  const fallback = JSON.stringify(initial);
  const name = `jarvis-learning:${key}`;
  const value = useSyncExternalStore(subscribe, () => localStorage.getItem(name) ?? fallback, () => fallback);
  const save = useCallback((next: T) => {
    localStorage.setItem(name, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
  }, [name]);
  return [JSON.parse(value) as T, save] as const;
}

export const field = "rounded-lg border border-[var(--stroke)] bg-[var(--panel-raised)] px-3 py-2 text-[var(--text)]";
export const button = "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5338b2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#49319e] disabled:opacity-50";

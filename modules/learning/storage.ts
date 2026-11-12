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

export const field = "rounded-md border border-[#a6b8aa] bg-white px-3 py-2";
export const button = "rounded-md bg-[#234c3c] px-4 py-2 font-semibold text-white disabled:opacity-50";

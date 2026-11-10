export type FocusMode = "focus" | "break";

export type ActiveFocusTimer = {
  id: string;
  mode: FocusMode;
  state: "running" | "paused";
  label: string;
  ends_at: string | null;
  remaining_seconds: number | null;
};

export function focusSeconds(timer: ActiveFocusTimer, now: number) {
  if (timer.state === "paused") return timer.remaining_seconds ?? 0;
  return Math.max(0, Math.ceil((Date.parse(timer.ends_at ?? "") - now) / 1000));
}

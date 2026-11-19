import { useEffect, useState } from "react";

export function useGameTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(interval);
  }, [running]);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return { seconds, formatted: `${minutes}:${remainder}`, pause: () => setRunning(false) };
}

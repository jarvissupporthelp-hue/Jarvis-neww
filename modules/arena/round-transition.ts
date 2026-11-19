import { useEffect, useRef, useState } from "react";

export function useRoundTransition() {
  const timer = useRef<number | undefined>(undefined);
  const [pending, setPending] = useState(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function advanceAfterFeedback(advance: () => void, delay: number) {
    if (timer.current !== undefined) return;
    setPending(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setPending(false);
      advance();
    }, delay);
  }

  return { pending, advanceAfterFeedback, isTransitioning: () => timer.current !== undefined };
}

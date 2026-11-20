// Only borrow a topic when the whole request refers back to the conversation.
const continuation = /^(?:(?:please )?(?:why|how so|continue|tell me more|explain (?:it|that|this)(?: again| more simply)?|(?:can you )?(?:give|show) me (?:an|another) example)|pourquoi|continuez|un autre exemple|explique plus simplement|почему|продолжай|приведи пример|ինչու|շարունակիր|օրինակ բեր)$/iu;

function isContinuation(prompt: string) {
  return continuation.test(prompt.trim().replace(/[.!?։՞՛]+/gu, "").trim());
}

export function studySearchQuery(prompt: string, newestFirst: { prompt: string }[]) {
  if (!isContinuation(prompt)) return prompt;
  const topic = newestFirst.find((turn) => !isContinuation(turn.prompt));
  return topic ? topic.prompt.slice(0, 1200) : prompt;
}

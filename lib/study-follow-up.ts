// Only borrow a topic when the whole request refers back to the conversation.
const continuation = /^(?:(?:please )?(?:why|how so|continue|tell me more|explain (?:it|that|this)(?: again| more simply)?|(?:can you )?(?:give|show) me (?:an|another) example)|pourquoi|continuez|un autre exemple|explique plus simplement|почему|продолжай|приведи пример|ինչու|շարունակիր|օրինակ բեր)$/iu;

function isContinuation(prompt: string) {
  return continuation.test(prompt.trim().replace(/[.!?։՞՛]+/gu, "").trim());
}

export function studySearchQuery(prompt: string, newestFirst: { prompt: string }[]) {
  const clean = (text: string) => text.trim().replace(/[.!?։՞՛]+/gu, "").trim();
  const dependsOnHistory = (text: string) => isContinuation(text) || yearFollowUp.test(clean(text)) || related.test(clean(text));
  if (!dependsOnHistory(prompt)) return prompt;
  const anchor = newestFirst.findIndex(turn => !dependsOnHistory(turn.prompt));
  if (anchor < 0) return prompt;
  const topic = newestFirst[anchor].prompt.slice(0, 1200);
  const qualifier = [prompt, ...newestFirst.slice(0, anchor).map(turn => turn.prompt)]
    .find(text => !isContinuation(text));
  return qualifier ? topic + "\n" + qualifier : topic;
}

const yearFollowUp = /^(?:and (?:what about )?(?:in )?|what about |et (?:en )?|а (?:на |в )?|իսկ )?(?:(?:year|année|курс|կուրս)\s*[1-4]|(?:first|second|third|fourth|première|deuxième|troisième|quatrième|первом|втором|третьем|четвертом|առաջին|երկրորդ|երրորդ|չորրորդ|[1-4](?:st|nd|rd|th|e|ème|er)?)\s+(?:year|année|курсе|կուրսում))$/iu;
const related = /^(?:(?:how|what) about (?:him|her|that course)|does (?:he|she) teach .+|what does (?:he|she) teach.*|can you explain (?:that|it) .+|et (?:lui|elle)|а что насчёт этого|իսկ նա)$/iu;

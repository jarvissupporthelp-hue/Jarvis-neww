type Question = {
  id: string;
  topic: string;
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation: string;
};

// These formative pilot questions use standard networking and SQL concepts.
const banks: ReadonlyMap<string, readonly Question[]> = new Map([
  ["DEMO-NET", [
    {
      id: "subnet-hosts", topic: "IPv4 subnetting",
      prompt: "In a conventional IPv4 /26 subnet, how many addresses can be assigned to hosts?",
      options: ["30", "62", "64", "126"], answer: 1,
      explanation: "A /26 leaves 6 host bits. Subtract the network and broadcast addresses from 2⁶ to get 62 usable host addresses.",
    },
    {
      id: "longest-prefix", topic: "IP routing",
      prompt: "A router has matching routes for 10.0.0.0/8 and 10.1.0.0/16. Which route matches 10.1.2.3 most specifically?",
      options: ["10.1.0.0/16", "10.0.0.0/8", "Both are equally specific", "Neither route"], answer: 0,
      explanation: "Longest-prefix matching selects /16 because it matches more leading destination bits than /8.",
    },
    {
      id: "local-mac", topic: "ARP and local delivery",
      prompt: "Which protocol resolves a known IPv4 address to a MAC address on the local network?",
      options: ["DNS", "TCP", "ARP", "DHCP"], answer: 2,
      explanation: "ARP discovers the link-layer address associated with an IPv4 address on the local link.",
    },
  ]],
  ["DEMO-DB", [
    {
      id: "primary-key", topic: "Primary keys",
      prompt: "What must a primary key guarantee about each row's key value?",
      options: ["It is always text", "It is always sequential", "It is unique and non-null", "It matches a value in another table"], answer: 2,
      explanation: "A primary key uniquely identifies each row. Its columns cannot contain NULL.",
    },
    {
      id: "left-join", topic: "SQL joins",
      prompt: "What happens to a row on the left side of a LEFT JOIN when it has no match on the right?",
      options: ["The row is excluded", "The row is kept with NULL right-side columns", "The row is duplicated", "The query fails"], answer: 1,
      explanation: "A LEFT JOIN keeps unmatched left rows and supplies NULL for their right-side columns.",
    },
    {
      id: "rollback", topic: "Transactions",
      prompt: "Which command discards the changes made in the current uncommitted SQL transaction?",
      options: ["ROLLBACK", "COMMIT", "SELECT", "SAVEPOINT"], answer: 0,
      explanation: "ROLLBACK ends the transaction and discards its uncommitted changes.",
    },
  ]],
]);

export function quizQuestions(code: string) {
  return banks.get(code)?.map(({ id, topic, prompt, options }) => ({ id, topic, prompt, options }));
}

export function gradeQuiz(code: string, answers: unknown) {
  const questions = banks.get(code);
  if (!questions || !Array.isArray(answers) || answers.length !== questions.length) return null;
  if (questions.some((question, index) => {
    const answer = answers[index];
    return answer?.id !== question.id || !Number.isInteger(answer.choice)
      || answer.choice < 0 || answer.choice >= question.options.length;
  })) return null;

  const feedback = questions.map((question, index) => ({
    id: question.id,
    topic: question.topic,
    correct: answers[index].choice === question.answer,
    correctAnswer: question.options[question.answer],
    explanation: question.explanation,
  }));
  return {
    score: feedback.filter((item) => item.correct).length,
    feedback,
    practiceTopics: [...new Set(feedback.filter((item) => !item.correct).map((item) => item.topic))],
  };
}

export const learningCourses = [
  { code: "ALG301", title: "Algorithms", material: "Graph traversal notes",
    terms: [["Graph", "Graphe", "Գրաֆ", "Граф"], ["Queue", "File", "Հերթ", "Очередь"]],
    questions: [
      { topic: "Graph traversal", text: "Which structure does breadth-first search use?", choices: ["Queue", "Stack", "Heap"], answer: 0, why: "A queue processes nodes in discovery order.", source: "Graph traversal notes · Breadth-first search" },
      { topic: "Complexity", text: "What is binary search’s worst-case time on a sorted array?", choices: ["O(n)", "O(log n)", "O(n²)"], answer: 1, why: "Each comparison halves the remaining interval.", source: "Algorithms · Binary search" },
      { topic: "Graph traversal", text: "What does DFS prioritize?", choices: ["Highest weight", "Closest layer", "Continuing along one branch"], answer: 2, why: "DFS explores a branch before backtracking.", source: "Graph traversal notes · Depth-first search" },
    ],
  },
  { code: "ARC301", title: "Computer Architecture", material: "Cache and processor notes",
    terms: [["Cache", "Mémoire cache", "Քեշ հիշողություն", "Кэш"], ["Register", "Registre", "Ռեգիստր", "Регистр"]],
    questions: [
      { topic: "Memory", text: "What is the purpose of a CPU cache?", choices: ["Store backups", "Reduce memory access latency", "Replace all registers"], answer: 1, why: "A cache stores copies of recently or frequently used data near the CPU.", source: "Cache and processor notes · Memory hierarchy" },
      { topic: "Processor", text: "Which unit performs arithmetic and logic?", choices: ["ALU", "Control unit", "Clock"], answer: 0, why: "The arithmetic logic unit executes arithmetic and logical operations.", source: "Cache and processor notes · Processor components" },
    ],
  },
];

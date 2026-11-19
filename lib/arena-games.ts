export type ArenaGame={id:string;title:string;discipline:string;symbol:string;puzzles:readonly {prompt:string;choices:readonly string[];answer:number;explanation:string}[]};
export const arenaGames:readonly ArenaGame[] = [
  {
    "id": "logic-circuit-lab",
    "title": "Logic Circuit Lab",
    "discipline": "Computer Science",
    "symbol": "∧",
    "puzzles": [
      {
        "prompt": "AND: 1 AND 0 = ?",
        "choices": [
          "0",
          "1",
          "2"
        ],
        "answer": 0,
        "explanation": "AND is 1 only if both inputs are 1."
      },
      {
        "prompt": "XOR: 1 XOR 0 = ?",
        "choices": [
          "0",
          "1",
          "2"
        ],
        "answer": 1,
        "explanation": "XOR is true when inputs differ."
      },
      {
        "prompt": "NOT 0 = ?",
        "choices": [
          "0",
          "1",
          "-1"
        ],
        "answer": 1,
        "explanation": "NOT flips a bit."
      }
    ]
  },
  {
    "id": "orbital-ballistics-sim",
    "title": "Orbital Ballistics Simulator",
    "discipline": "Physics",
    "symbol": "↗",
    "puzzles": [
      {
        "prompt": "Launch angle for maximum range on level ground?",
        "choices": [
          "30°",
          "45°",
          "90°"
        ],
        "answer": 1,
        "explanation": "45° maximizes sin(2θ)."
      },
      {
        "prompt": "Dropped for 2s with g=10m/s²: distance?",
        "choices": [
          "10m",
          "20m",
          "40m"
        ],
        "answer": 1,
        "explanation": "Distance = gt²/2 = 20m."
      },
      {
        "prompt": "Vertical speed at highest point?",
        "choices": [
          "0",
          "9.8",
          "Maximum"
        ],
        "answer": 0,
        "explanation": "The apex has zero vertical velocity."
      }
    ]
  },
  {
    "id": "matrix-transform-arena",
    "title": "Matrix Transform Arena",
    "discipline": "Mathematics",
    "symbol": "▦",
    "puzzles": [
      {
        "prompt": "Identity matrix applied to (3,2)?",
        "choices": [
          "(2,3)",
          "(3,2)",
          "(0,0)"
        ],
        "answer": 1,
        "explanation": "Identity preserves the vector."
      },
      {
        "prompt": "diag(2,3) × (2,4)?",
        "choices": [
          "(4,12)",
          "(4,7)",
          "(6,8)"
        ],
        "answer": 0,
        "explanation": "Multiply each coordinate by its diagonal scale."
      },
      {
        "prompt": "det([[2,1],[3,4]]) = ?",
        "choices": [
          "8",
          "5",
          "11"
        ],
        "answer": 1,
        "explanation": "2×4 − 1×3 = 5."
      }
    ]
  },
  {
    "id": "algorithm-sort-duel",
    "title": "Algorithm Sort Duel",
    "discipline": "Computer Science",
    "symbol": "≡",
    "puzzles": [
      {
        "prompt": "First bubble-sort swap in [4,1,3,2]?",
        "choices": [
          "4 and 1",
          "1 and 3",
          "3 and 2"
        ],
        "answer": 0,
        "explanation": "The first adjacent inversion is 4 > 1."
      },
      {
        "prompt": "Merge sort typical runtime?",
        "choices": [
          "O(n)",
          "O(n log n)",
          "O(n²)"
        ],
        "answer": 1,
        "explanation": "Merging takes O(n) over log n levels."
      },
      {
        "prompt": "Binary search needs the array to be…",
        "choices": [
          "Sorted",
          "Unique",
          "Random"
        ],
        "answer": 0,
        "explanation": "Sorted ordering permits halving the search."
      }
    ]
  },
  {
    "id": "stoichiometry-balancer",
    "title": "Stoichiometry Balancer",
    "discipline": "Chemistry",
    "symbol": "⚗",
    "puzzles": [
      {
        "prompt": "__H₂ + O₂ → 2H₂O coefficient?",
        "choices": [
          "1",
          "2",
          "3"
        ],
        "answer": 1,
        "explanation": "2H₂ balances four hydrogen atoms."
      },
      {
        "prompt": "4Fe + __O₂ → 2Fe₂O₃ coefficient?",
        "choices": [
          "2",
          "3",
          "4"
        ],
        "answer": 1,
        "explanation": "Six oxygen atoms require three O₂."
      },
      {
        "prompt": "A balanced reaction conserves…",
        "choices": [
          "Number of molecules",
          "Atoms of each element",
          "Temperature"
        ],
        "answer": 1,
        "explanation": "Atomic counts are equal on both sides."
      }
    ]
  },
  {
    "id": "equilibrium-market-sim",
    "title": "Equilibrium Market Simulator",
    "discipline": "Economics",
    "symbol": "⇌",
    "puzzles": [
      {
        "prompt": "Qd=100−2P, Qs=20+2P. Equilibrium price?",
        "choices": [
          "10",
          "20",
          "30"
        ],
        "answer": 1,
        "explanation": "Set demand equal to supply: 80=4P."
      },
      {
        "prompt": "Binding price ceiling creates…",
        "choices": [
          "Shortage",
          "Surplus",
          "Neither"
        ],
        "answer": 0,
        "explanation": "Quantity demanded exceeds supplied."
      },
      {
        "prompt": "Qd=80, Qs=50. Shortage?",
        "choices": [
          "20",
          "30",
          "130"
        ],
        "answer": 1,
        "explanation": "80 − 50 = 30."
      }
    ]
  },
  {
    "id": "cipher-breaker-lab",
    "title": "Cipher Breaker Lab",
    "discipline": "Computer Science",
    "symbol": "⌁",
    "puzzles": [
      {
        "prompt": "Caesar shift +3: CAT → ?",
        "choices": [
          "FDW",
          "DBU",
          "ECV"
        ],
        "answer": 0,
        "explanation": "C→F, A→D, T→W."
      },
      {
        "prompt": "Caesar shift −3: KHOOR → ?",
        "choices": [
          "HELLO",
          "WORLD",
          "KHOOR"
        ],
        "answer": 0,
        "explanation": "Move each letter back three."
      },
      {
        "prompt": "ROT13 applied twice gives…",
        "choices": [
          "Original text",
          "Random text",
          "Reversed text"
        ],
        "answer": 0,
        "explanation": "ROT13 is its own inverse."
      }
    ]
  },
  {
    "id": "binary-hex-bridge",
    "title": "Binary–Hex Bridge",
    "discipline": "Computer Science",
    "symbol": "01",
    "puzzles": [
      {
        "prompt": "Binary 1010 in decimal?",
        "choices": [
          "9",
          "10",
          "12"
        ],
        "answer": 1,
        "explanation": "8 + 2 = 10."
      },
      {
        "prompt": "Hex FF in decimal?",
        "choices": [
          "255",
          "256",
          "15"
        ],
        "answer": 0,
        "explanation": "15×16 + 15 = 255."
      },
      {
        "prompt": "Decimal 13 in binary?",
        "choices": [
          "1101",
          "1011",
          "1110"
        ],
        "answer": 0,
        "explanation": "8 + 4 + 1 = 13."
      }
    ]
  },
  {
    "id": "calculus-integral-estimator",
    "title": "Calculus Integral Estimator",
    "discipline": "Mathematics",
    "symbol": "∫",
    "puzzles": [
      {
        "prompt": "∫₀² x dx = ?",
        "choices": [
          "1",
          "2",
          "4"
        ],
        "answer": 1,
        "explanation": "[x²/2] evaluated from 0 to 2 equals 2."
      },
      {
        "prompt": "∫₀³ 2 dx = ?",
        "choices": [
          "3",
          "6",
          "9"
        ],
        "answer": 1,
        "explanation": "Rectangle area = 2×3."
      },
      {
        "prompt": "Antiderivative of 3x²?",
        "choices": [
          "x³ + C",
          "6x + C",
          "3x³ + C"
        ],
        "answer": 0,
        "explanation": "Derivative of x³ is 3x²."
      }
    ]
  },
  {
    "id": "periodic-element-forge",
    "title": "Periodic Element Forge",
    "discipline": "Chemistry",
    "symbol": "⚛",
    "puzzles": [
      {
        "prompt": "Element with atomic number 8?",
        "choices": [
          "Carbon",
          "Oxygen",
          "Neon"
        ],
        "answer": 1,
        "explanation": "Oxygen has 8 protons."
      },
      {
        "prompt": "Which is a noble gas?",
        "choices": [
          "Neon",
          "Sodium",
          "Iron"
        ],
        "answer": 0,
        "explanation": "Neon is in group 18."
      },
      {
        "prompt": "Symbol Fe means…",
        "choices": [
          "Fluorine",
          "Iron",
          "Fermium"
        ],
        "answer": 1,
        "explanation": "Fe comes from ferrum."
      }
    ]
  }
];
export function findArenaGame(id:string){return arenaGames.find(game=>game.id===id)}

type Deck = { code: string; title: string; entries: [string, string, string, string, string][] };

const decks: Deck[] = [
  {
    "code": "MATH-CS",
    "title": "Mathematics for CS",
    "entries": [
      [
        "Matrices",
        "When is matrix multiplication AB defined?",
        "Columns of A equal rows of B",
        "Rows of A equal rows of B",
        "Both are square"
      ],
      [
        "Matrices",
        "What happens to a determinant when two rows are swapped?",
        "Its sign reverses",
        "It doubles",
        "It becomes zero"
      ],
      [
        "Matrices",
        "When is a square matrix invertible?",
        "Its determinant is nonzero",
        "Its trace is positive",
        "It contains no zeros"
      ],
      [
        "Matrices",
        "What size is a 2×3 matrix times a 3×4 matrix?",
        "2×4",
        "3×3",
        "4×2"
      ],
      [
        "Vectors",
        "What does a basis do?",
        "Spans the space with independent vectors",
        "Contains every vector",
        "Contains the zero vector"
      ],
      [
        "Vectors",
        "When are two nonzero vectors orthogonal?",
        "Their dot product is zero",
        "Their lengths are equal",
        "Their dot product is one"
      ],
      [
        "Vectors",
        "What is matrix rank?",
        "Number of independent columns",
        "Number of nonzero entries",
        "Number of rows"
      ],
      [
        "Vectors",
        "What is the null space of A?",
        "Vectors x satisfying Ax = 0",
        "All nonzero rows of A",
        "Vectors x satisfying Ax = x"
      ],
      [
        "Modelling",
        "What does least squares minimize?",
        "Sum of squared residuals",
        "Sum of predictions",
        "Largest prediction"
      ],
      [
        "Modelling",
        "What equation defines an eigenvector?",
        "Av = λv",
        "A + v = λ",
        "Av = v + λ"
      ],
      [
        "Modelling",
        "What does a linear map do to a sum?",
        "T(u + v) = T(u) + T(v)",
        "T(u + v) = T(u) − T(v)",
        "T(u + v) = T(u)T(v)"
      ],
      [
        "Modelling",
        "What is the usual dimension of the solution space to Ax = 0?",
        "Number of columns minus rank",
        "Rank minus columns",
        "Always zero"
      ]
    ]
  },
  {
    "code": "NET1",
    "title": "Computer Networks 1",
    "entries": [
      [
        "Ethernet",
        "What is the data unit at the data link layer?",
        "Frame",
        "Segment",
        "Bitstream"
      ],
      [
        "Ethernet",
        "Which address does a switch learn from an incoming frame?",
        "Source MAC address",
        "Destination IP address",
        "Source TCP port"
      ],
      [
        "Ethernet",
        "What does ARP resolve on an IPv4 LAN?",
        "IPv4 address to MAC address",
        "Hostname to IPv6 address",
        "Port to process ID"
      ],
      [
        "Ethernet",
        "What does the FCS detect?",
        "Frame transmission errors",
        "Duplicate IP addresses",
        "Application ports"
      ],
      [
        "IPv4",
        "How many usable hosts are in a conventional /26 subnet?",
        "62",
        "64",
        "30"
      ],
      [
        "IPv4",
        "If /16 and /24 both match, which route wins?",
        "/24",
        "/16",
        "Both always"
      ],
      [
        "IPv4",
        "Which IPv4 field prevents indefinite forwarding loops?",
        "TTL",
        "DSCP",
        "Source port"
      ],
      [
        "IPv4",
        "Which device forwards packets between IP networks?",
        "Router",
        "Hub",
        "Repeater"
      ],
      [
        "Transport",
        "What is the TCP opening handshake?",
        "SYN → SYN-ACK → ACK",
        "ACK → FIN → SYN",
        "SYN → ACK → FIN"
      ],
      [
        "Transport",
        "What delivery guarantee does UDP give?",
        "None",
        "Guaranteed in order",
        "Guaranteed retransmission"
      ],
      [
        "Services",
        "Which protocol leases IP configuration?",
        "DHCP",
        "ARP",
        "ICMP"
      ],
      [
        "Services",
        "What does a DNS A record contain?",
        "An IPv4 address",
        "An IPv6 address",
        "A MAC address"
      ]
    ]
  },
  {
    "code": "FRE301",
    "title": "French",
    "entries": [
      [
        "Grammar",
        "Il faut que tu ___ demain. (venir)",
        "viennes",
        "viens",
        "viendras"
      ],
      [
        "Grammar",
        "Le fichier ___ je parle. (parler de)",
        "dont",
        "que",
        "où"
      ],
      [
        "Grammar",
        "Le programme ___ fonctionne.",
        "qui",
        "que",
        "dont"
      ],
      [
        "Grammar",
        "Je ___ ai envoyé le document. (à Marie)",
        "lui",
        "la",
        "les"
      ],
      [
        "Grammar",
        "Which phrase uses the gérondif?",
        "en travaillant",
        "avoir travaillé",
        "je travaille"
      ],
      [
        "Grammar",
        "Si j’avais le temps, je ___ le cours. (suivre)",
        "suivrais",
        "suivrai",
        "suis"
      ],
      [
        "Connectors",
        "Which connector introduces a consequence?",
        "par conséquent",
        "bien que",
        "en raison de"
      ],
      [
        "Connectors",
        "Which phrase means despite the difficulty?",
        "malgré la difficulté",
        "grâce à la difficulté",
        "afin de la difficulté"
      ],
      [
        "Connectors",
        "Which phrase introduces a purpose before an infinitive?",
        "afin de",
        "en dépit de",
        "à cause de"
      ],
      [
        "Academic French",
        "What does rendre un devoir mean?",
        "Submit an assignment",
        "Retake an exam",
        "Borrow a book"
      ],
      [
        "Academic French",
        "What is une échéance?",
        "A deadline",
        "A grade",
        "A classroom"
      ],
      [
        "Academic French",
        "Which opener suits a formal email?",
        "Madame, Monsieur,",
        "Salut tout le monde,",
        "À plus,"
      ]
    ]
  },
  {
    "code": "ENG301",
    "title": "English",
    "entries": [
      [
        "Grammar",
        "I have studied networking ___ September.",
        "since",
        "for",
        "during"
      ],
      [
        "Grammar",
        "The results ___ checked yesterday.",
        "were",
        "have",
        "are being"
      ],
      [
        "Grammar",
        "If the server fails, we ___ the backup.",
        "will restore",
        "restored",
        "would have restored"
      ],
      [
        "Grammar",
        "Which sentence is correct?",
        "The results were collected in October.",
        "The results was collect in October.",
        "The results were collecting in October."
      ],
      [
        "Academic writing",
        "Which phrase introduces a contrast?",
        "However,",
        "Therefore,",
        "For instance,"
      ],
      [
        "Academic writing",
        "What is a concise synonym for carry out an experiment?",
        "Conduct an experiment",
        "Avoid an experiment",
        "Publish an experiment"
      ],
      [
        "Academic writing",
        "Which verb means support a claim with evidence?",
        "Substantiate",
        "Speculate",
        "Contradict"
      ],
      [
        "Academic writing",
        "Which phrase introduces an example?",
        "For instance,",
        "As a result,",
        "Nevertheless,"
      ],
      [
        "Technical English",
        "What is a prerequisite?",
        "Something required beforehand",
        "An optional final step",
        "An unexpected failure"
      ],
      [
        "Technical English",
        "What does troubleshoot mean?",
        "Diagnose and resolve a problem",
        "Ignore an error",
        "Create a backup"
      ],
      [
        "Technical English",
        "What is a bottleneck?",
        "A constraint that limits throughput",
        "A copy of data",
        "An unusually fast connection"
      ],
      [
        "Technical English",
        "What does reproduce a bug mean?",
        "Make the same failure happen again",
        "Remove the faulty code",
        "Report an unrelated issue"
      ]
    ]
  },
  {
    "code": "ALG301",
    "title": "Algorithms",
    "entries": [
      [
        "Graphs",
        "Which structure does BFS use?",
        "Queue",
        "Stack",
        "Heap"
      ],
      [
        "Graphs",
        "Which structure is typical for iterative DFS?",
        "Stack",
        "Queue",
        "Hash set alone"
      ],
      [
        "Graphs",
        "When does BFS find shortest paths?",
        "In an unweighted graph",
        "With arbitrary negative weights",
        "Only in complete graphs"
      ],
      [
        "Graphs",
        "What edge-weight restriction does Dijkstra’s algorithm require?",
        "Nonnegative edge weights",
        "All negative weights",
        "Identical weights"
      ],
      [
        "Complexity",
        "What is binary search’s worst-case time?",
        "O(log n)",
        "O(n)",
        "O(n²)"
      ],
      [
        "Complexity",
        "What is the time for two full nested n-iteration loops?",
        "O(n²)",
        "O(log n)",
        "O(n)"
      ],
      [
        "Complexity",
        "What is average-case hash lookup with controlled load?",
        "O(1)",
        "O(log n)",
        "O(n²)"
      ],
      [
        "Complexity",
        "What is merge sort’s worst-case time?",
        "O(n log n)",
        "O(n²)",
        "O(n)"
      ],
      [
        "Structures",
        "What is at the root of a min-heap?",
        "The smallest key",
        "The largest key",
        "The most recent key"
      ],
      [
        "Structures",
        "Which policy does a queue follow?",
        "FIFO",
        "LIFO",
        "Largest first"
      ],
      [
        "Structures",
        "How long does random indexing into an array take?",
        "O(1)",
        "O(log n)",
        "O(n)"
      ],
      [
        "Structures",
        "What makes a sorting algorithm stable?",
        "Equal keys keep their relative order",
        "It always sorts in place",
        "It uses no comparisons"
      ]
    ]
  },
  {
    "code": "ARC301",
    "title": "Computer Architecture",
    "entries": [
      [
        "Memory",
        "Why use a CPU cache?",
        "Reduce average memory-access latency",
        "Store backups",
        "Replace registers"
      ],
      [
        "Memory",
        "What is temporal locality?",
        "Recent data is likely to be reused soon",
        "Nearby data is likely to be accessed",
        "Data is accessed only once"
      ],
      [
        "Memory",
        "What is spatial locality?",
        "Addresses near a recent access are likely to be accessed",
        "Only the same address is reused",
        "All addresses are random"
      ],
      [
        "Memory",
        "What happens on a cache miss?",
        "Data is fetched from a lower level",
        "The instruction always aborts",
        "The cache is disabled"
      ],
      [
        "Processor",
        "Which unit performs arithmetic and logic?",
        "ALU",
        "Control unit",
        "Clock"
      ],
      [
        "Processor",
        "What does the program counter track?",
        "Instruction address",
        "Thread count",
        "Cache size"
      ],
      [
        "Processor",
        "What is an instruction set architecture?",
        "Programmer-visible processor contract",
        "Motherboard layout",
        "Compiler optimization"
      ],
      [
        "Processor",
        "What is the primary goal of pipelining?",
        "Improve instruction throughput",
        "Eliminate the clock",
        "Use one stage"
      ],
      [
        "Representation",
        "What is the signed range of 8-bit two’s complement?",
        "−128 to 127",
        "−127 to 127",
        "0 to 255"
      ],
      [
        "Representation",
        "What unsigned decimal value is binary 1010?",
        "10",
        "8",
        "12"
      ],
      [
        "Representation",
        "What hexadecimal digit corresponds to binary 1111?",
        "F",
        "E",
        "A"
      ],
      [
        "Representation",
        "What does little-endian place at the lowest address?",
        "Least significant byte",
        "Most significant byte",
        "A separate sign byte"
      ]
    ]
  }
];

export const learningCourses = decks.map(({ code, title, entries }) => ({
  code, title, material: `${title} review notes`,
  questions: entries.map(([topic, text, why, wrong1, wrong2], index) => {
    const choices = [wrong1, wrong2];
    const answer = index % 3;
    choices.splice(answer, 0, why);
    return { id: `${code}:${index + 1}`, topic, text, choices, answer, why, source: `JARVIS study deck · ${title} · ${topic}` };
  }),
}));

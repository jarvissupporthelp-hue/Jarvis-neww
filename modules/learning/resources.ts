type CourseResource = {
  id: string;
  title: string;
  type: "link";
  content: string;
  description: string;
  tags: string[];
};

export const courseResources: Partial<Record<string, CourseResource[]>> = {
  "MATH-CS": [
    {
      "id": "resource-MATH-CS-1",
      "title": "MIT OpenCourseWare: Linear Algebra",
      "type": "link",
      "content": "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
      "description": "Review matrices, vector spaces and eigenvalues with lectures and practice exams.",
      "tags": [
        "linear algebra",
        "lectures"
      ]
    },
    {
      "id": "resource-MATH-CS-2",
      "title": "Georgia Tech: Interactive Linear Algebra",
      "type": "link",
      "content": "https://textbooks.math.gatech.edu/ila/",
      "description": "Explore row reduction, linear transformations and their geometry in an interactive textbook.",
      "tags": [
        "linear algebra",
        "interactive"
      ]
    }
  ],
  "NET1": [
    {
      "id": "resource-NET1-1",
      "title": "Cloudflare Learning Center: Subnetting",
      "type": "link",
      "content": "https://www.cloudflare.com/learning/network-layer/what-is-a-subnet/",
      "description": "Review how subnet masks and IP address ranges divide a network.",
      "tags": [
        "subnetting",
        "reference"
      ]
    },
    {
      "id": "resource-NET1-2",
      "title": "Wireshark User’s Guide",
      "type": "link",
      "content": "https://www.wireshark.org/docs/wsug_html_chunked/",
      "description": "Learn to capture and filter packets to see protocols in action.",
      "tags": [
        "packets",
        "lab"
      ]
    }
  ],
  "FRE301": [
    {
      "id": "resource-FRE301-1",
      "title": "Partajon DELF DALF",
      "type": "link",
      "content": "https://www.partajondelfdalf.com",
      "description": "Practise DELF and DALF listening with exam-style questions and answer keys.",
      "tags": [
        "DELF",
        "listening"
      ]
    },
    {
      "id": "resource-FRE301-2",
      "title": "TV5MONDE: Learn French",
      "type": "link",
      "content": "https://apprendre.tv5monde.com/en",
      "description": "Practise listening and vocabulary with videos and exercises by level.",
      "tags": [
        "listening",
        "vocabulary"
      ]
    }
  ],
  "ENG301": [
    {
      "id": "resource-ENG301-1",
      "title": "British Council LearnEnglish",
      "type": "link",
      "content": "https://learnenglish.britishcouncil.org/free-resources",
      "description": "Find exercises by level and practise listening, reading, writing and speaking.",
      "tags": [
        "skills practice",
        "grammar"
      ]
    },
    {
      "id": "resource-ENG301-2",
      "title": "Cambridge English: B2 First Preparation",
      "type": "link",
      "content": "https://www.cambridgeenglish.org/exams-and-tests/qualifications/first/preparation/",
      "description": "Use official sample papers and preparation resources for B2 First.",
      "tags": [
        "B2 First",
        "exam prep"
      ]
    }
  ],
  "ALG301": [
    {
      "id": "resource-ALG301-1",
      "title": "VisuAlgo",
      "type": "link",
      "content": "https://visualgo.net/en",
      "description": "Step through animated sorting, tree and graph algorithms, then practise with training questions.",
      "tags": [
        "algorithms",
        "interactive"
      ]
    },
    {
      "id": "resource-ALG301-2",
      "title": "MIT OpenCourseWare: Introduction to Algorithms",
      "type": "link",
      "content": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
      "description": "Study data structures, graph algorithms and dynamic programming with lectures and problem sets.",
      "tags": [
        "algorithms",
        "practice problems"
      ]
    }
  ],
  "ARC301": [
    {
      "id": "resource-ARC301-1",
      "title": "Nand to Tetris",
      "type": "link",
      "content": "https://www.nand2tetris.org/",
      "description": "Build up from logic gates to a working computer through guided projects.",
      "tags": [
        "digital logic",
        "projects"
      ]
    },
    {
      "id": "resource-ARC301-2",
      "title": "MIT Computation Structures",
      "type": "link",
      "content": "https://computationstructures.org/",
      "description": "Use lecture notes, worksheets and browser labs to study digital circuits and processors.",
      "tags": [
        "computer architecture",
        "lab"
      ]
    }
  ]
};

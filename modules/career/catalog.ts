export const skills = [
  ["JavaScript", "JS", "Build a browser-based task board"],
  ["TypeScript", "TS", "Add typed forms and validation to a web app"],
  ["React", "React.js", "Build a reusable component library"],
  ["SQL", "Structured Query Language", "Write queries for a library inventory"],
  ["PostgreSQL", "Postgres", "Model university room reservations"],
  ["Python", "Python 3", "Analyse a public dataset"],
  ["Git", "Version control", "Publish a project with reviewable pull requests"],
  ["Linux", "GNU/Linux", "Automate a local backup with shell scripts"],
  ["Docker", "Containers", "Containerize an application and its database"],
  ["CI/CD", "Continuous integration", "Build a pipeline that runs tests on pull requests"],
  ["Networking", "Computer Networks", "Document a small network design"],
  ["TCP/IP", "Internet Protocol Suite", "Explain packet flow using a local packet capture"],
  ["Algorithms", "Algorithm design", "Benchmark sorting algorithms"],
  ["Data Structures", "DSA", "Build a priority queue with a heap"],
  ["Linear Algebra", "Matrix algebra", "Visualize matrix transformations"],
  ["Statistics", "Stats", "Compare two sampling methods"],
  ["C", "C language", "Implement a linked list with tests"],
  ["C#", "C Sharp", "Build an inventory API in C#"],
  ["HTML", "HTML5", "Build an accessible portfolio page"],
  ["CSS", "CSS3", "Recreate a responsive dashboard"],
  ["Testing", "QA", "Add unit and integration tests to a project"],
  ["Accessibility", "A11y", "Audit and improve keyboard navigation"],
  ["Data Analysis", "Analytics", "Create a reproducible data analysis notebook"],
  ["Communication", "Written communication", "Write a technical handoff for a teammate"],
  ["French", "Français", "Prepare a French presentation on a software project"],
  ["English", "Anglais", "Write and present a technical case study in English"],
  ["UI Design", "UI", "Prototype a student-facing dashboard"],
  ["REST APIs", "REST", "Build and document a CRUD API"],
  ["Computer Architecture", "CPU architecture", "Build a small CPU simulator"],
  ["Excel", "Spreadsheets", "Create a budget tracker with pivot tables"],
] as const;

export const courseSkills: Record<string, { title: string; skills: string[] }> = {
  "MATH-CS": { title: "Mathematics for CS", skills: ["Linear Algebra"] },
  NET1: { title: "Computer Networks 1", skills: ["Networking", "TCP/IP"] },
  ARC301: { title: "Computer Architecture", skills: ["Computer Architecture", "C"] },
  ALG301: { title: "Algorithms", skills: ["Algorithms", "Data Structures"] },
  FRE301: { title: "French", skills: ["French", "Communication"] },
  ENG301: { title: "English", skills: ["English", "Communication"] },
  CS301: { title: "C# Programming", skills: ["C#", "Testing"] },
};

const openings = [
  ["Junior Frontend Developer", "Yerevan", "JS, React, CSS"],
  ["Junior Backend Developer", "Remote", "TypeScript, SQL, REST"],
  ["Junior Data Analyst", "Yerevan", "Python, SQL, Excel"],
  ["Junior QA Engineer", "Yerevan", "Testing, Git, Communication"],
  ["Junior DevOps Engineer", "Hybrid", "Linux, Docker, CI/CD"],
  ["Network Support Specialist", "Yerevan", "Networking, TCP/IP, Linux"],
  ["Junior C# Developer", "Hybrid", "C#, REST APIs, PostgreSQL"],
  ["Web Accessibility Assistant", "Remote", "HTML, CSS, A11y"],
  ["Technical Support Associate", "Yerevan", "Networking, English, Communication"],
  ["Research Assistant", "Yerevan", "Python, Statistics, Data Analysis"],
  ["Junior UI Developer", "Remote", "React, TypeScript, UI Design"],
  ["Bilingual Project Coordinator", "Hybrid", "French, English, Excel"],
  ["Software Engineering Intern", "Yerevan", "Algorithms, Git, Python"],
  ["Data Engineering Intern", "Remote", "SQL, Python, Postgres"],
  ["Frontend Intern", "Hybrid", "JavaScript, HTML, CSS"],
  ["Infrastructure Intern", "Yerevan", "Linux, Networking, Docker"],
  ["Embedded Systems Intern", "Yerevan", "C, CPU architecture, Git"],
  ["Product Design Intern", "Remote", "UI Design, Accessibility, Communication"],
  ["Analytics Intern", "Hybrid", "Statistics, Excel, SQL"],
  ["QA Automation Intern", "Yerevan", "Testing, JS, CI/CD"],
] as const;

export const postings = openings.map(([title, location, requirements], index) => ({
  id: String(index + 1), title, location, requirements: requirements.split(", "),
  type: index < 12 ? "Job" : "Internship",
  employer: ["Ararat Software", "Cascade Labs", "Sevan Analytics", "Nairi Technologies", "Arax Digital"][index % 5],
  deadline: new Date(Date.UTC(2027, 0, 12 + index * 4)).toISOString().slice(0, 10),
  description: index < 12
    ? "Join a small team, contribute to real deliverables, and explain your decisions in reviews. Include a relevant work sample with your application."
    : "Work with a supervisor on a scoped project, keep a weekly progress log, and present your results at the end of the internship.",
}));

export const mentors = [
  { id: "frontend", name: "Mariam Grigoryan", specialty: "Frontend and CV reviews" },
  { id: "data", name: "David Petrosyan", specialty: "Data analysis and SQL projects" },
  { id: "systems", name: "Lilit Hakobyan", specialty: "Linux, networking, and DevOps" },
  { id: "interviews", name: "Aram Sargsyan", specialty: "Technical interviews" },
  { id: "internships", name: "Anna Mkrtchyan", specialty: "Internship applications and reporting" },
];

export const questions = [
  ["Behavioral", "Tell me about a project you are proud of."],
  ["Behavioral", "Describe a disagreement within a team and how you resolved it."],
  ["Behavioral", "Tell me about a time you missed a deadline or changed a plan."],
  ["Programming", "How would you detect duplicate values in a list?"],
  ["Programming", "How do you debug a failing feature you did not write?"],
  ["Data", "Explain the difference between an inner join and a left join."],
  ["Data", "How would you validate an unfamiliar dataset?"],
  ["Systems", "What happens when you type a URL into a browser?"],
  ["Systems", "How would you diagnose a service that suddenly became slow?"],
  ["Career", "Why are you interested in this internship, and what would you like to learn?"],
] as const;

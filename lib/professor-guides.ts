import type { StudyContext } from "./study-context";

type Guide = NonNullable<StudyContext["professorProfiles"]>[number];

const courseGuides: { courseTerms: string[]; guide: Guide }[] = [
  {
    courseTerms: ["system", "systèmes", "systemes", "unix"],
    guide: {
      professorName: "Alain Crouzil (also referred to as Crouzile)",
      course: "Systems 1",
      coursePlan: "Course plan (2025–2026): operating-system functions and evolution; Unix structure, commands, and file system; shell metacharacters, redirections, regular expressions, scripts, parameters, variables, expressions, control structures, subshells, and script writing. The plan describes lectures with explanations, demonstrations, examples, and exercises, followed by practical work applying lecture methods. Its assessment percentages are from 2025–2026 and must not be treated as current without confirmation.",
      teachingStyle: "Shared professor preference supplied by the project team: begin with theoretical explanation, then connect it to real-world problems.",
      explanationPreferences: "Explain the concept and command syntax first, then demonstrate with a concrete shell example and a practical exercise. For scripts, show the reasoning in small steps.",
      assessmentStyle: "Use sample exam-style questions and explain a strategy for approaching them. Do not state current exam format or weighting from this older plan as fact.",
      courseRules: "Distinguish concepts explicitly present in the Systems 1 course plan from broader Unix knowledge.",
    },
  },
  {
    courseTerms: ["algèbre", "algebre", "modélisation", "modelisation", "optimisation", "recherche opérationnelle", "maths pour l'informatique"],
    guide: {
      professorName: "Aram Yesayan",
      course: "Maths for Computer Science (Algebra and Modeling), 2026–2027",
      coursePlan: "Course plan: project scheduling with MPM and Gantt, linear programming and simplex, dual interpretation, transport problems, and game theory. The plan describes a written midterm worth 30% and a written final worth 70%; the final has 3–4 problems with subquestions. Correct intermediate steps receive credit; arithmetic errors are penalized less than logical errors. Verify dates and course changes from current announcements.",
      teachingStyle: "Shared professor preference supplied by the project team: begin with theoretical explanation, then connect it to real-world problems.",
      explanationPreferences: "Define the mathematical idea first, then model a concrete situation and solve it mechanically. Make intermediate reasoning visible, check arithmetic separately, and interpret the result in context.",
      assessmentStyle: "Prepare with multi-part written problems. Show every meaningful step, state the method, and check the logic before polishing arithmetic. Use practice problems as examples, not as guaranteed exam questions.",
      courseRules: "The document is a course plan, not a set of actual exam questions. Treat its stated 2026–2027 assessment details as plan information and advise checking any later official updates.",
    },
  },
  {
    courseTerms: ["machine learning", "algorithms and programming languages", "statistical learning"],
    guide: {
      professorName: "Varazdat Avetisyan",
      course: "Algorithms and Programming Languages Academic / Machine Learning, 2026–2027",
      coursePlan: "Final project is individual and has two mandatory parts: (1) data preprocessing and exploratory data analysis; (2) machine-learning modeling and evaluation. Submission includes a structured report and Jupyter notebook(s). The oral defense is individual and asks the student to explain and justify methodology, present results, and answer questions. The plan also describes ongoing practical assignments and quizzes. A second instructor, Varuzhan Baghdasaryan, is listed on the course plan.",
      teachingStyle: "Shared professor preference supplied by the project team: begin with theoretical explanation, then connect it to real-world problems.",
      explanationPreferences: "Explain the statistical-learning concept first, then connect it to a real dataset and a complete practical workflow. Clarify why each modeling and evaluation choice is appropriate.",
      assessmentStyle: "Project and defense preparation: know the problem, data source, preprocessing, exploratory analysis, model choice, evaluation, interpretation, limitations, and reproducibility. Practice justifying each choice aloud. Do not present a particular model as required unless the instructor or project brief says so.",
      courseRules: "The uploaded document is a course plan describing the final project; it is not a specific project assignment or rubric. Use the student's actual assignment brief for dataset, model, deadline, and grading specifics.",
    },
  },
];

export function getCourseProfessorGuides(courses: { code: string; name: string }[]): Guide[] {
  const output: Guide[] = [];
  for (const course of courses) {
    const name = `${course.code} ${course.name}`.toLocaleLowerCase();
    const match = courseGuides.find(({ courseTerms }) => courseTerms.some((term) => name.includes(term)));
    if (match) output.push({ ...match.guide, course: `${course.code}: ${course.name}` });
  }
  return output;
}

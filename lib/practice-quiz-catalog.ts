const subjects = {
  Mathematics: ["Linear equations", "Areas of triangles", "Arithmetic sequences", "Percent change"],
  Physics: ["Constant-speed motion", "Newton’s second law", "Kinetic energy", "Ohm’s law"],
  Chemistry: ["Molar mass", "Solution concentration", "Reaction stoichiometry", "Dilution"],
  Computing: ["Binary to decimal", "Hexadecimal to decimal", "Digital storage", "Array indexing"],
  Statistics: ["Arithmetic mean", "Data range", "Simple probability", "Weighted mean"],
} as const;

export type PracticeSubject = keyof typeof subjects;
export const practiceSubjects = Object.keys(subjects) as PracticeSubject[];
export const practiceQuestionCount = 30;

export const practiceQuizzes = practiceSubjects.flatMap(subject =>
  subjects[subject].flatMap((topic, topicIndex) =>
    Array.from({ length: 5 }, (_, index) => ({
      id: `${subject.toLowerCase()}-${topicIndex + 1}-${index + 1}`,
      title: `${topic} · Set ${index + 1}`,
      subject,
      topic,
      topicIndex,
      set: index + 1,
    })),
  ),
);

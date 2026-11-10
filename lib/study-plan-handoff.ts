export const studyPlanHandoffKey = "jarvis.study-plan-handoff";

export type StudyPlanHandoff = {
  topic: string;
  examDate: string;
  minutes: number;
};

export type QuizPlanHandoff = {
  kind: "quiz";
  offeringId: string;
  topics: string[];
};

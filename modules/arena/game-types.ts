export const gameDifficulties = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
export type GameDifficulty = (typeof gameDifficulties)[number];

export interface PracticeOutcome {
  score: number;
  maxScore: number;
  accuracy: number;
  roundsCompleted: number;
  totalRounds: number;
  hintsUsed?: number;
  submissionPayload?: Record<string, unknown>;
  highlights?: string[];
}

export interface ActiveGameRenderProps {
  difficulty: GameDifficulty;
  onFinish: (outcome: PracticeOutcome) => void;
}

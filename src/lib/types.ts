export type AppMode =
  | "home"
  | "host"
  | "leader"
  | "game"
  | "leaderboard"
  | "summary";

export type RoundType =
  | "voting"
  | "all_play"
  | "quiz_burst"
  | "bible_speed"
  | "dance_battle"
  | "steal"
  | "final_double";

export type RoundStatus =
  | "lobby"
  | "reveal"
  | "live"
  | "voting"
  | "locked"
  | "scoring"
  | "complete"
  | "winner";

export type QuestionStatus =
  | "waiting"
  | "live"
  | "locked"
  | "revealed"
  | "scored"
  | "complete";

export type QuizCategory = "bible_knowledge" | "bible_reference";
export type QuizDifficulty = "easy" | "medium" | "hard";

export type ChallengeParticipantMode = "all_teams" | "head_to_head";
export type ChallengeMatchupRule =
  | "none"
  | "vote_runner_up"
  | "leaderboard_leader"
  | "host_choice";
export type ChallengeScoringMode = "manual" | "winner_points" | "steal" | "quiz";

export type ChallengeConfig = {
  participantMode: ChallengeParticipantMode;
  participantCount: number | null;
  durationSeconds: number | null;
  matchupRule: ChallengeMatchupRule;
  winCondition: string;
  scoringMode: ChallengeScoringMode;
  winnerPoints?: number;
  runnerUpPoints?: number;
  stealAmount?: number;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer?: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  timeLimitSeconds: number;
  points: number;
};

export type PlannedRound = RoundDefinition & {
  id: string;
  createdAt: string;
};

export type Room = {
  id: string;
  code: string;
  host_pin?: string;
  status: string;
  planned_round_queue?: PlannedRound[] | null;
  created_at?: string;
};

export type Team = {
  id: string;
  room_id: string;
  name: string;
  leader_code?: string;
  score: number;
  joined_at?: string | null;
  animal?: string | null;
  avatar_emoji?: string | null;
  avatar_image?: string | null;
  color?: string | null;
};

export type TeamDraft = {
  id: string;
  name: string;
  animal: string;
  avatarEmoji: string;
  avatarImage: string;
  color: string;
  leaderCode: string;
};

export type VoteRow = {
  id: string;
  round_id: string;
  voter_team_id: string;
  target_team_id: string;
};

export type AnswerSubmission = {
  id: string;
  round_id: string;
  team_id: string;
  question_index: number;
  answer: string;
  is_correct: boolean;
  submitted_at: string;
};

export type ScoreEvent = {
  id: string;
  room_id: string;
  round_id: string | null;
  team_id: string;
  delta: number;
  reason: string;
  created_at: string;
  undone_at?: string | null;
  dedupe_key?: string | null;
};

export type RoundRecord = {
  id: string;
  room_id: string;
  round_number?: number | null;
  round_type: RoundType;
  title: string;
  prompt: string;
  challenge: string;
  scoring_guide: string;
  twist?: string | null;
  instructions?: string | null;
  status: RoundStatus;
  target_team_id: string | null;
  rival_team_id?: string | null;
  challenge_config?: ChallengeConfig | null;
  challenge_winner_team_id?: string | null;
  challenge_resolved_at?: string | null;
  is_final?: boolean | null;
  timer_seconds?: number | null;
  answer_options?: string[] | null;
  correct_answer?: string | null;
  question_set?: QuizQuestion[] | null;
  current_question_index?: number | null;
  question_status?: QuestionStatus | null;
  question_started_at?: string | null;
  started_at?: string | null;
  created_at: string;
};

export type RoundDefinition = {
  type: RoundType;
  title: string;
  prompt: string;
  challenge: string;
  instructions: string;
  scoringGuide: string;
  twist?: string;
  requiresVoting: boolean;
  challengeConfig?: ChallengeConfig;
  isFinal?: boolean;
  answerOptions?: string[];
  correctAnswer?: string;
  questionSet?: QuizQuestion[];
  currentQuestionIndex?: number;
  questionStatus?: QuestionStatus;
};

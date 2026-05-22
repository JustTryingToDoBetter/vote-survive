export type AppMode = "home" | "host" | "leader" | "audience" | "summary";

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
  | "voting"
  | "locked"
  | "scoring"
  | "complete"
  | "winner";

export type Room = {
  id: string;
  code: string;
  host_pin: string;
  status: string;
  created_at?: string;
};

export type Team = {
  id: string;
  room_id: string;
  name: string;
  leader_code: string;
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

export type ScoreEvent = {
  id: string;
  room_id: string;
  round_id: string | null;
  team_id: string;
  delta: number;
  reason: string;
  created_at: string;
  undone_at?: string | null;
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
  is_final?: boolean | null;
  timer_seconds?: number | null;
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
  isFinal?: boolean;
};

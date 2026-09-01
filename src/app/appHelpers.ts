import { roundTypeLabels } from "../data/gameContent";
import { DEFAULT_TEAMS } from "../data/teamPresets";
import type {
  QuestionStatus,
  QuizQuestion,
  RoundRecord,
  RoundStatus,
  RoundType,
  Team,
} from "../lib/types";

export const HOST_SESSION_KEY = "vote-survive-host-session";
export const LEADER_SESSION_KEY = "vote-survive-leader-session";

export function generateCode(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export function createDefaultDrafts() {
  return DEFAULT_TEAMS.map((preset) => ({
    id: crypto.randomUUID(),
    name: preset.name,
    animal: preset.animal,
    avatarEmoji: preset.avatarEmoji,
    avatarImage: preset.avatarImage,
    color: preset.color,
    leaderCode: generateCode(4),
  }));
}

export function toRoundRecord(row: Record<string, unknown>): RoundRecord {
  const roundType = (row.round_type as RoundType | undefined) ?? "voting";
  const challenge = String(row.challenge ?? "");
  const prompt = String(row.prompt ?? row.question ?? "");
  const title =
    String(row.title ?? "").trim() || roundTypeLabels[roundType] || "Round";
  const questionSet = Array.isArray(row.question_set)
    ? (row.question_set as QuizQuestion[])
    : null;

  return {
    id: String(row.id),
    room_id: String(row.room_id),
    round_number: (row.round_number as number | null | undefined) ?? null,
    round_type: roundType,
    title,
    prompt,
    challenge,
    scoring_guide: String(row.scoring_guide ?? "Score every team after the round."),
    twist: (row.twist as string | null | undefined) ?? null,
    instructions:
      (row.instructions as string | null | undefined) ??
      "Follow the host prompt and score every team.",
    status: (row.status as RoundStatus | undefined) ?? "lobby",
    target_team_id: (row.target_team_id as string | null | undefined) ?? null,
    is_final:
      (row.is_final as boolean | null | undefined) ??
      roundType === "final_double",
    timer_seconds: (row.timer_seconds as number | null | undefined) ?? null,
    answer_options: Array.isArray(row.answer_options)
      ? (row.answer_options as string[])
      : null,
    correct_answer: (row.correct_answer as string | null | undefined) ?? null,
    question_set: questionSet,
    current_question_index:
      typeof row.current_question_index === "number"
        ? row.current_question_index
        : Number(row.current_question_index ?? 0),
    question_status:
      (row.question_status as QuestionStatus | null | undefined) ?? null,
    question_started_at:
      (row.question_started_at as string | null | undefined) ?? null,
    started_at: (row.started_at as string | null | undefined) ?? null,
    created_at: String(row.created_at),
  };
}

export function toLegacyRoundPayload(payload: {
  room_id: string;
  title: string;
  prompt: string;
  question: string;
  challenge: string;
  status: RoundStatus;
  target_team_id?: string | null;
}) {
  return {
    room_id: payload.room_id,
    question: payload.question || payload.prompt || payload.title,
    challenge: payload.challenge,
    status: payload.status,
    target_team_id: payload.target_team_id ?? null,
  };
}

export function normalizeTeam(team: Team, fallbackIndex: number): Team {
  const preset = DEFAULT_TEAMS[fallbackIndex % DEFAULT_TEAMS.length];

  return {
    ...team,
    animal: team.animal ?? preset.animal,
    avatar_emoji: team.avatar_emoji ?? preset.avatarEmoji,
    avatar_image: team.avatar_image ?? preset.avatarImage,
    color: team.color ?? preset.color,
  };
}

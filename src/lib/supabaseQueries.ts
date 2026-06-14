import { toRoundRecord } from "../app/appHelpers";
import { normalizeTeam } from "../app/appHelpers";
import { supabase } from "./supabase";
import type { AnswerSubmission, Room, RoundRecord, ScoreEvent, Team, VoteRow } from "./types";

export const roomColumns = "id,code,host_pin,status,created_at";
export const teamColumns =
  "id,room_id,name,leader_code,score,joined_at,animal,avatar_emoji,avatar_image,color";
export const roundColumns =
  "id,room_id,round_number,round_type,title,prompt,question,challenge,scoring_guide,instructions,twist,status,target_team_id,is_final,timer_seconds,answer_options,correct_answer,question_set,current_question_index,question_status,question_started_at,created_at";
export const voteColumns = "id,round_id,voter_team_id,target_team_id";
export const answerColumns =
  "id,round_id,team_id,question_index,answer,is_correct,submitted_at";
export const scoreColumns =
  "id,room_id,round_id,team_id,delta,reason,created_at,undone_at,dedupe_key";

export function mapAnswerSubmission(row: Record<string, unknown>): AnswerSubmission {
  return {
    id: String(row.id),
    round_id: String(row.round_id),
    team_id: String(row.team_id),
    question_index:
      typeof row.question_index === "number" ? row.question_index : Number(row.question_index ?? 0),
    answer: String(row.answer ?? ""),
    is_correct: Boolean(row.is_correct),
    submitted_at: String(row.submitted_at),
  };
}

export async function fetchRoom(roomId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select(roomColumns)
    .eq("id", roomId)
    .single();

  if (error) throw error;
  return data as Room;
}

export async function fetchRoomByCode(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select(roomColumns)
    .eq("code", code)
    .single();

  if (error) throw error;
  return data as Room;
}

export async function fetchTeams(roomId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(teamColumns)
    .eq("room_id", roomId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((team, index) => normalizeTeam(team as Team, index));
}

export async function fetchTeamByLeaderCode(roomId: string, leaderCode: string) {
  const { data, error } = await supabase
    .from("teams")
    .select(teamColumns)
    .eq("room_id", roomId)
    .eq("leader_code", leaderCode)
    .single();

  if (error) throw error;
  return normalizeTeam(data as Team, 0);
}

export async function fetchRounds(roomId: string) {
  const { data, error } = await supabase
    .from("rounds")
    .select(roundColumns)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toRoundRecord(row as Record<string, unknown>));
}

export async function fetchVotes(roundId: string) {
  const { data, error } = await supabase
    .from("votes")
    .select(voteColumns)
    .eq("round_id", roundId);

  if (error) throw error;
  return (data ?? []) as VoteRow[];
}

export async function fetchAnswers(roundId: string) {
  const { data, error } = await supabase
    .from("answer_submissions")
    .select(answerColumns)
    .eq("round_id", roundId)
    .order("submitted_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapAnswerSubmission(row as Record<string, unknown>));
}

export async function fetchScores(roomId: string) {
  const { data, error } = await supabase
    .from("score_events")
    .select(scoreColumns)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ScoreEvent[];
}

export function getActiveRound(rounds: RoundRecord[]) {
  return rounds.find((round) => round.status !== "complete") ?? null;
}

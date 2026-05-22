// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { challenges, randomItem, votingQuestions } from "./data/gameContent";
import "./App.css";

type Room = {
  id: string;
  code: string;
  host_pin: string;
  status: string;
};

type Team = {
  id: string;
  room_id: string;
  name: string;
  leader_code: string;
  score: number;
};

type Round = {
  id: string;
  room_id: string;
  question: string;
  challenge: string;
  status: "voting" | "locked" | "complete";
  target_team_id: string | null;
};

type Vote = {
  id: string;
  round_id: string;
  voter_team_id: string;
  target_team_id: string;
};

const DEFAULT_TEAMS = ["David", "Esther", "Elijah", "Ruth"];

function generateCode(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export default function App() {
  const [mode, setMode] = useState<"home" | "host" | "leader">("home");
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [leaderTeam, setLeaderTeam] = useState<Team | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const voteCounts = useMemo(() => {
    return teams.map((team) => ({
      team,
      count: votes.filter((vote) => vote.target_team_id === team.id).length
    }));
  }, [teams, votes]);

  const leaderHasVoted = useMemo(() => {
    if (!leaderTeam || !activeRound) return false;
    return votes.some((vote) => vote.voter_team_id === leaderTeam.id);
  }, [leaderTeam, activeRound, votes]);

  async function createRoom() {
    setIsLoading(true);

    const code = generateCode();
    const hostPin = generateCode(6);

    const { data: createdRoom, error: roomError } = await supabase
      .from("rooms")
      .insert({ code, host_pin: hostPin })
      .select()
      .single();

    if (roomError) {
      alert(roomError.message);
      setIsLoading(false);
      return;
    }

    const teamRows = DEFAULT_TEAMS.map((name) => ({
      room_id: createdRoom.id,
      name: `Team ${name}`,
      leader_code: generateCode(4)
    }));

    const { data: createdTeams, error: teamsError } = await supabase
      .from("teams")
      .insert(teamRows)
      .select();

    if (teamsError) {
      alert(teamsError.message);
      setIsLoading(false);
      return;
    }

    setRoom(createdRoom);
    setTeams(createdTeams ?? []);
    setMode("host");
    setIsLoading(false);
  }

  async function joinAsLeader() {
    setIsLoading(true);

    const { data: foundRoom, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", roomCodeInput.trim().toUpperCase())
      .single();

    if (roomError || !foundRoom) {
      alert("Room not found.");
      setIsLoading(false);
      return;
    }

    const { data: foundTeam, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("room_id", foundRoom.id)
      .eq("leader_code", teamCodeInput.trim().toUpperCase())
      .single();

    if (teamError || !foundTeam) {
      alert("Team code not found.");
      setIsLoading(false);
      return;
    }

    setRoom(foundRoom);
    setLeaderTeam(foundTeam);
    setMode("leader");
    setIsLoading(false);
  }

  async function refreshRoomData(roomId: string) {
    const [{ data: teamRows }, { data: roundRows }] = await Promise.all([
      supabase.from("teams").select("*").eq("room_id", roomId).order("score", { ascending: false }),
      supabase.from("rounds").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(1)
    ]);

    setTeams(teamRows ?? []);

    const latestRound = roundRows?.[0] ?? null;
    setActiveRound(latestRound);

    if (latestRound) {
      const { data: voteRows } = await supabase.from("votes").select("*").eq("round_id", latestRound.id);
      setVotes(voteRows ?? []);
    } else {
      setVotes([]);
    }
  }

  useEffect(() => {
    if (!room) return;

    refreshRoomData(room.id);

    const channel = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => refreshRoomData(room.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => refreshRoomData(room.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => refreshRoomData(room.id))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  async function startRound() {
    if (!room) return;

    await supabase.from("rounds").insert({
      room_id: room.id,
      question: randomItem(votingQuestions),
      challenge: randomItem(challenges),
      status: "voting"
    });
  }

  async function submitVote(targetTeamId: string) {
    if (!activeRound || !leaderTeam || targetTeamId === leaderTeam.id) return;

    const { error } = await supabase.from("votes").upsert(
      {
        round_id: activeRound.id,
        voter_team_id: leaderTeam.id,
        target_team_id: targetTeamId
      },
      { onConflict: "round_id,voter_team_id" }
    );

    if (error) alert(error.message);
  }

  async function lockVotes() {
    if (!activeRound) return;

    const winner = voteCounts.reduce((max, item) => (item.count > max.count ? item : max), voteCounts[0]);

    await supabase
      .from("rounds")
      .update({
        status: "locked",
        target_team_id: winner?.team.id ?? null
      })
      .eq("id", activeRound.id);
  }

  async function awardPoints(points: number) {
    if (!activeRound?.target_team_id) return;

    const targetTeam = teams.find((team) => team.id === activeRound.target_team_id);
    if (!targetTeam) return;

    await supabase
      .from("teams")
      .update({ score: targetTeam.score + points })
      .eq("id", targetTeam.id);

    await supabase.from("rounds").update({ status: "complete" }).eq("id", activeRound.id);
  }

  if (mode === "home") {
    return (
      <main className="page">
        <section className="card hero">
          <p className="eyebrow">Youth Night Game</p>
          <h1>Vote & Survive</h1>
          <p className="muted">
            A live voting game where leaders vote from their phones and the host controls the chaos.
          </p>

          <button disabled={isLoading} onClick={createRoom}>
            {isLoading ? "Creating..." : "Create Host Room"}
          </button>

          <div className="join-box">
            <h2>Leader Login</h2>
            <input
              placeholder="Room code"
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value)}
            />
            <input
              placeholder="Team code"
              value={teamCodeInput}
              onChange={(event) => setTeamCodeInput(event.target.value)}
            />
            <button disabled={isLoading} onClick={joinAsLeader}>
              Join as Leader
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "leader") {
    return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">Room {room?.code}</p>
          <h1>{leaderTeam?.name}</h1>

          {!activeRound && <p className="muted">Waiting for the host to start a round...</p>}

          {activeRound && (
            <>
              <h2>{activeRound.question}</h2>
              <p className="muted">Vote for another team. You cannot vote for yourself.</p>

              <div className="grid">
                {teams
                  .filter((team) => team.id !== leaderTeam?.id)
                  .map((team) => (
                    <button
                      key={team.id}
                      disabled={activeRound.status !== "voting"}
                      onClick={() => submitVote(team.id)}
                    >
                      Vote {team.name}
                    </button>
                  ))}
              </div>

              {leaderHasVoted && <p className="success">Vote submitted.</p>}

              {activeRound.status === "locked" && (
                <div className="challenge">
                  <p className="eyebrow">Challenge</p>
                  <h2>{activeRound.challenge}</h2>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="host-layout">
        <div className="card">
          <p className="eyebrow">Host Room</p>
          <h1>Room Code: {room?.code}</h1>
          <p className="muted">Give each leader their team code.</p>

          <div className="team-list">
            {teams.map((team) => (
              <div className="team-row" key={team.id}>
                <span>{team.name}</span>
                <strong>{team.leader_code}</strong>
              </div>
            ))}
          </div>

          <button onClick={startRound}>Start New Round</button>
        </div>

        <div className="card">
          <p className="eyebrow">Current Round</p>

          {!activeRound && <p className="muted">No active round yet.</p>}

          {activeRound && (
            <>
              <h2>{activeRound.question}</h2>

              <div className="results">
                {voteCounts.map(({ team, count }) => (
                  <div className="result-row" key={team.id}>
                    <span>{team.name}</span>
                    <strong>{count} votes</strong>
                  </div>
                ))}
              </div>

              {activeRound.status === "voting" && <button onClick={lockVotes}>Lock Votes</button>}

              {activeRound.status === "locked" && (
                <div className="challenge">
                  <p className="eyebrow">Voted Team Challenge</p>
                  <h2>{teams.find((team) => team.id === activeRound.target_team_id)?.name}</h2>
                  <p>{activeRound.challenge}</p>

                  <div className="button-row">
                    <button onClick={() => awardPoints(5)}>Success: +5</button>
                    <button onClick={() => awardPoints(-3)}>Fail: -3</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <p className="eyebrow">Scoreboard</p>
          <div className="team-list">
            {teams.map((team) => (
              <div className="team-row" key={team.id}>
                <span>{team.name}</span>
                <strong>{team.score}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
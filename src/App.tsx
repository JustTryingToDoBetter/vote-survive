import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Gamepad2,
  Play,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { buildRoundContent, DEFAULT_TEAMS } from "./data/gameContent";
import { supabase } from "./lib/supabase";
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
  created_at: string;
};

type VoteRow = {
  id: string;
  round_id: string;
  voter_team_id: string;
  target_team_id: string;
};

const ROUND_SECONDS = 45;

const teamColors = [
  "#ff4d6d",
  "#7c3aed",
  "#06b6d4",
  "#f59e0b",
  "#22c55e",
  "#fb7185",
];

function generateCode(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

function getInitials(name: string) {
  return name
    .replace("Team", "")
    .trim()
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function teamStyle(index: number) {
  return {
    "--team-color": teamColors[index % teamColors.length],
  } as React.CSSProperties;
}

export default function App() {
  const [mode, setMode] = useState<"home" | "host" | "leader">("home");
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [leaderTeam, setLeaderTeam] = useState<Team | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => b.score - a.score),
    [teams]
  );

  const secondsLeft = useMemo(() => {
    if (!activeRound || activeRound.status !== "voting") return 0;

    const created = new Date(activeRound.created_at).getTime();
    const elapsed = Math.floor((now - created) / 1000);

    return Math.max(0, ROUND_SECONDS - elapsed);
  }, [activeRound, now]);

  const voteCounts = useMemo(() => {
    return teams.map((team) => ({
      team,
      count: votes.filter((vote) => vote.target_team_id === team.id).length,
    }));
  }, [teams, votes]);

  const sortedVoteCounts = useMemo(
    () => [...voteCounts].sort((a, b) => b.count - a.count),
    [voteCounts]
  );

  const targetTeam = useMemo(() => {
    if (!activeRound?.target_team_id) return null;
    return teams.find((team) => team.id === activeRound.target_team_id) ?? null;
  }, [activeRound, teams]);

  const rivalTeam = useMemo(() => {
    if (!targetTeam) return null;
    return (
      sortedVoteCounts.find((entry) => entry.team.id !== targetTeam.id)?.team ??
      null
    );
  }, [targetTeam, sortedVoteCounts]);

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
      name,
      leader_code: generateCode(4),
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
      supabase
        .from("teams")
        .select("*")
        .eq("room_id", roomId)
        .order("score", { ascending: false }),
      supabase
        .from("rounds")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setTeams(teamRows ?? []);

    const latestRound = roundRows?.[0] ?? null;
    setActiveRound(latestRound);

    if (!latestRound) {
      setVotes([]);
      return;
    }

    const { data: voteRows } = await supabase
      .from("votes")
      .select("*")
      .eq("round_id", latestRound.id);

    setVotes(voteRows ?? []);
  }

  useEffect(() => {
    if (!room) return;

    refreshRoomData(room.id);

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => refreshRoomData(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        () => refreshRoomData(room.id)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => refreshRoomData(room.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  async function startRound() {
    if (!room) return;

    const round = buildRoundContent();

    await supabase.from("rounds").insert({
      room_id: room.id,
      question: round.question,
      challenge: round.challenge,
      status: "voting",
    });
  }

  async function submitVote(targetTeamId: string) {
    if (!activeRound || !leaderTeam || targetTeamId === leaderTeam.id) return;

    const { error } = await supabase.from("votes").upsert(
      {
        round_id: activeRound.id,
        voter_team_id: leaderTeam.id,
        target_team_id: targetTeamId,
      },
      { onConflict: "round_id,voter_team_id" }
    );

    if (error) alert(error.message);
  }

  async function lockVotes() {
    if (!activeRound) return;

    const winner = sortedVoteCounts[0];

    await supabase
      .from("rounds")
      .update({
        status: "locked",
        target_team_id: winner?.team.id ?? null,
      })
      .eq("id", activeRound.id);
  }
async function updateTeamScore(teamId: string, delta: number) {
  const selectedTeam = teams.find((team) => team.id === teamId);
  if (!selectedTeam) return;

  await supabase
    .from("teams")
    .update({ score: selectedTeam.score + delta })
    .eq("id", teamId);
}

async function completeRound() {
  if (!activeRound) return;

  await supabase
    .from("rounds")
    .update({ status: "complete" })
    .eq("id", activeRound.id);
}
  async function awardPoints(points: number) {
    if (!activeRound?.target_team_id) return;

    const selectedTeam = teams.find(
      (team) => team.id === activeRound.target_team_id
    );

    if (!selectedTeam) return;

    await supabase
      .from("teams")
      .update({ score: selectedTeam.score + points })
      .eq("id", selectedTeam.id);

    await supabase
      .from("rounds")
      .update({ status: "complete" })
      .eq("id", activeRound.id);
  }

  return (
    <AnimatePresence mode="wait">
      {mode === "home" && (
        <HomeScreen
          isLoading={isLoading}
          roomCodeInput={roomCodeInput}
          teamCodeInput={teamCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          setTeamCodeInput={setTeamCodeInput}
          createRoom={createRoom}
          joinAsLeader={joinAsLeader}
        />
      )}

      {mode === "host" && room && (
        <HostScreen
          room={room}
          teams={teams}
          sortedTeams={sortedTeams}
          activeRound={activeRound}
          voteCounts={voteCounts}
          sortedVoteCounts={sortedVoteCounts}
          targetTeam={targetTeam}
          rivalTeam={rivalTeam}
          secondsLeft={secondsLeft}
          startRound={startRound}
          lockVotes={lockVotes}
          updateTeamScore={updateTeamScore}
          completeRound={completeRound}
        />
      )}

      {mode === "leader" && room && leaderTeam && (
        <LeaderScreen
          room={room}
          teams={teams}
          leaderTeam={leaderTeam}
          activeRound={activeRound}
          secondsLeft={secondsLeft}
          leaderHasVoted={leaderHasVoted}
          submitVote={submitVote}
        />
      )}
    </AnimatePresence>
  );
}

function HomeScreen(props: {
  isLoading: boolean;
  roomCodeInput: string;
  teamCodeInput: string;
  setRoomCodeInput: (value: string) => void;
  setTeamCodeInput: (value: string) => void;
  createRoom: () => void;
  joinAsLeader: () => void;
}) {
  return (
    <motion.main
      className="landing-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <nav className="top-nav">
        <div className="brand">
          <div className="brand-mark">
            <Shield size={22} />
          </div>
          <div>
            <strong>Vote & Survive</strong>
            <span>LIVE</span>
          </div>
        </div>

        <div className="nav-links">
          <a>Home</a>
          <a>How It Works</a>
          <a>Game Modes</a>
          <a>Leaderboard</a>
        </div>

        <button className="nav-cta" onClick={props.createRoom}>
          Start Game
        </button>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="pill">
            <Sparkles size={16} />
            Youth Night Game Show
          </div>

          <h1>
            Vote Fast.
            <br />
            Challenge Hard.
            <br />
            <span>Win Big.</span>
          </h1>

          <p>
            Leaders join from their phones, vote against rival teams, trigger
            challenge battles, and fight for the top of the live leaderboard.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={props.createRoom}>
              <Play size={18} />
              {props.isLoading ? "Creating..." : "Start a Game"}
            </button>
            <a className="secondary-btn" href="#leader-login">
              Join with Code
            </a>
          </div>

          <div className="hero-stats">
            <Stat icon={<Users size={18} />} value="4+" label="Teams" />
            <Stat icon={<Vote size={18} />} value="Live" label="Voting" />
            <Stat icon={<Trophy size={18} />} value="30m" label="Game Time" />
          </div>
        </div>

        <div className="mascot-panel">
          <div className="confetti-dot dot-one" />
          <div className="confetti-dot dot-two" />
          <div className="confetti-dot dot-three" />

          <motion.div
            className="panda-card"
            animate={{ y: [0, -10, 0], rotate: [0, -1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="panda-face">
              <span className="ear left" />
              <span className="ear right" />
              <span className="eye left" />
              <span className="eye right" />
              <span className="nose" />
              <span className="smile" />
            </div>

            <div className="panda-sign">
              <strong>LET'S GO</strong>
              <span>TEAM!</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="feature-row">
        <FeatureCard
          icon={<Vote />}
          title="Live Rival Voting"
          text="Leaders vote for other teams. No self-voting. Maximum drama."
        />
        <FeatureCard
          icon={<Zap />}
          title="Challenge Battles"
          text="The most-voted team enters a face-off, steal round, or quiz burst."
        />
        <FeatureCard
          icon={<Crown />}
          title="Leaderboard Energy"
          text="Scores update live so every round feels like a comeback chance."
        />
      </section>

      <section id="leader-login" className="join-panel">
        <div>
          <p className="section-kicker">Leader Login</p>
          <h2>Join the room from your phone</h2>
          <p>
            The host creates a room. Each leader gets a team code and votes from
            their own device.
          </p>
        </div>

        <div className="join-form">
          <input
            placeholder="Room code"
            value={props.roomCodeInput}
            onChange={(event) =>
              props.setRoomCodeInput(event.target.value.toUpperCase())
            }
          />
          <input
            placeholder="Team code"
            value={props.teamCodeInput}
            onChange={(event) =>
              props.setTeamCodeInput(event.target.value.toUpperCase())
            }
          />
          <button onClick={props.joinAsLeader}>Join as Leader</button>
        </div>
      </section>
    </motion.main>
  );
}

function HostScreen(props: {
 room: Room;
  teams: Team[];
  sortedTeams: Team[];
  activeRound: Round | null;
  voteCounts: { team: Team; count: number }[];
  sortedVoteCounts: { team: Team; count: number }[];
  targetTeam: Team | null;
  rivalTeam: Team | null;
  secondsLeft: number;
  startRound: () => void;
  lockVotes: () => void;
  updateTeamScore: (teamId: string, delta: number) => void;
  completeRound: () => void;
}) {
  const totalVotes = props.voteCounts.reduce((sum, item) => sum + item.count, 0);
  const maxScore = Math.max(1, ...props.teams.map((team) => team.score));

  return (
    <motion.main
      className="game-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="game-header">
        <div>
          <p className="section-kicker">Host Screen</p>
          <h1>Room Code: {props.room.code}</h1>
        </div>

        <button className="primary-btn" onClick={props.startRound}>
          <Play size={18} />
          New Round
        </button>
      </header>

      <section className="host-grid">
        <div className="game-card current-round-card">
          <div className="card-title-row">
            <div>
              <p className="section-kicker">Current Round</p>
              <h2>
                {props.activeRound
                  ? props.activeRound.question
                  : "Start the first round"}
              </h2>
            </div>

            {props.activeRound?.status === "voting" && (
              <TimerRing secondsLeft={props.secondsLeft} />
            )}
          </div>

          {!props.activeRound && (
            <p className="muted-text">
              Click New Round when everyone is ready. Leaders will vote from
              their phones.
            </p>
          )}

          {props.activeRound?.status === "voting" && (
            <>
              <div className="live-badge">
                <span />
                Voting is live
              </div>

              <div className="vote-bars">
                {props.voteCounts.map((entry, index) => (
                  <VoteBar
                    key={entry.team.id}
                    team={entry.team}
                    count={entry.count}
                    max={Math.max(1, props.sortedVoteCounts[0]?.count ?? 1)}
                    index={index}
                  />
                ))}
              </div>

              <button className="danger-btn" onClick={props.lockVotes}>
                Lock Votes & Reveal Challenge
              </button>
            </>
          )}

          {props.activeRound?.status === "locked" && props.targetTeam && (
            <AllTeamScoringPanel
              teams={props.teams}
              sortedTeams={props.sortedTeams}
              targetTeam={props.targetTeam}
              challenge={props.activeRound.challenge}
              updateTeamScore={props.updateTeamScore}
              completeRound={props.completeRound}
            />
          )}

          {props.activeRound?.status === "complete" && (
            <div className="complete-panel">
              <Trophy size={34} />
              <h3>Round Complete</h3>
              <p>Start a new round to keep the comeback alive.</p>
            </div>
          )}
        </div>

        <div className="game-card">
          <p className="section-kicker">Live Leaderboard</p>

          <div className="leaderboard">
            {props.sortedTeams.map((team, index) => (
              <LeaderboardScoreCard
                key={team.id}
                team={team}
                rank={index + 1}
                index={index}
                maxScore={maxScore}
              />
            ))}
          </div>
        </div>

        <div className="game-card">
          <p className="section-kicker">Team Codes</p>

          <div className="team-code-grid">
            {props.teams.map((team, index) => (
              <div className="team-code-card" key={team.id} style={teamStyle(index)}>
                <div className="team-avatar">{getInitials(team.name)}</div>
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.leader_code}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mini-info">
            <Users size={18} />
            {totalVotes} votes this round
          </div>
        </div>
      </section>
    </motion.main>
  );
}

function LeaderScreen(props: {
  room: Room;
  teams: Team[];
  leaderTeam: Team;
  activeRound: Round | null;
  secondsLeft: number;
  leaderHasVoted: boolean;
  submitVote: (targetTeamId: string) => void;
}) {
  return (
    <motion.main
      className="leader-shell"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <header className="mobile-top">
        <div>
          <p className="section-kicker">Room {props.room.code}</p>
          <h1>{props.leaderTeam.name}</h1>
        </div>

        {props.activeRound?.status === "voting" && (
          <TimerRing secondsLeft={props.secondsLeft} compact />
        )}
      </header>

      {!props.activeRound && (
        <div className="game-card waiting-card">
          <Gamepad2 size={44} />
          <h2>Waiting for host...</h2>
          <p>The next vote will appear here.</p>
        </div>
      )}

      {props.activeRound && (
        <section className="game-card leader-vote-card">
          <p className="section-kicker">
            {props.activeRound.status === "voting"
              ? "Vote Against a Team"
              : "Round Locked"}
          </p>

          <h2>{props.activeRound.question}</h2>

          {props.activeRound.status === "voting" && (
            <>
              <p className="muted-text">
                Choose the team that should enter the arena. You cannot vote for
                yourself.
              </p>

              <div className="vote-tile-grid">
                {props.teams
                  .filter((team) => team.id !== props.leaderTeam.id)
                  .map((team, index) => (
                    <motion.button
                      key={team.id}
                      className="vote-tile"
                      style={teamStyle(index)}
                      onClick={() => props.submitVote(team.id)}
                      whileTap={{ scale: 0.96 }}
                    >
                      <span className="team-avatar">{getInitials(team.name)}</span>
                      <strong>{team.name}</strong>
                      <small>Send to arena</small>
                    </motion.button>
                  ))}
              </div>

              {props.leaderHasVoted && (
                <motion.div
                  className="submitted-banner"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Sparkles size={18} />
                  Vote submitted. You can still change it before lock.
                </motion.div>
              )}
            </>
          )}

          {props.activeRound.status !== "voting" && (
            <div className="challenge-preview">
              <p className="section-kicker">Challenge Reveal</p>
              <h3>{props.activeRound.challenge}</h3>
            </div>
          )}
        </section>
      )}
    </motion.main>
  );
}

function TimerRing(props: { secondsLeft: number; compact?: boolean }) {
  const percentage = (props.secondsLeft / ROUND_SECONDS) * 100;

  return (
    <div
      className={props.compact ? "timer-ring compact" : "timer-ring"}
      style={{ "--progress": `${percentage}%` } as React.CSSProperties}
    >
      <strong>{props.secondsLeft}</strong>
      {!props.compact && <span>sec</span>}
    </div>
  );
}

function Stat(props: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-card">
      <div>{props.icon}</div>
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </div>
  );
}

function FeatureCard(props: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.article
      className="feature-card"
      whileHover={{ y: -6, rotate: -0.4 }}
    >
      <div className="feature-icon">{props.icon}</div>
      <h3>{props.title}</h3>
      <p>{props.text}</p>
    </motion.article>
  );
}

function VoteBar(props: {
  team: Team;
  count: number;
  max: number;
  index: number;
}) {
  const width = `${Math.max(8, (props.count / props.max) * 100)}%`;

  return (
    <div className="vote-bar-wrap" style={teamStyle(props.index)}>
      <div className="vote-bar-meta">
        <strong>{props.team.name}</strong>
        <span>{props.count} votes</span>
      </div>
      <div className="vote-bar-track">
        <motion.div
          className="vote-bar-fill"
          initial={{ width: 0 }}
          animate={{ width }}
        />
      </div>
    </div>
  );
}

function AllTeamScoringPanel(props: {
  teams: Team[];
  sortedTeams: Team[];
  targetTeam: Team | null;
  challenge: string;
  updateTeamScore: (teamId: string, delta: number) => void;
  completeRound: () => void;
}) {
  return (
    <motion.div
      className="all-team-scoring"
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="arena-label">
        <Zap size={18} />
        All Teams Play
      </div>

      {props.targetTeam && (
        <div className="pressure-banner">
          <strong>{props.targetTeam.name}</strong>
          <span>received the most votes and gets the pressure twist.</span>
        </div>
      )}

      <h3>{props.challenge}</h3>

      <div className="rubric-card">
        <p className="section-kicker">Suggested Scoring</p>
        <div className="rubric-grid">
          <span>🥇 1st</span>
          <strong>+10</strong>
          <span>🥈 2nd</span>
          <strong>+7</strong>
          <span>🥉 3rd</span>
          <strong>+5</strong>
          <span>Participation</span>
          <strong>+2</strong>
        </div>
      </div>

      <div className="score-team-list">
        {props.sortedTeams.map((team, index) => (
          <div className="score-team-row" key={team.id} style={teamStyle(index)}>
            <div className="team-avatar">{getInitials(team.name)}</div>

            <div>
              <strong>{team.name}</strong>
              <span>{team.score} pts</span>
            </div>

            <div className="quick-score-actions">
              <button onClick={() => props.updateTeamScore(team.id, 2)}>+2</button>
              <button onClick={() => props.updateTeamScore(team.id, 5)}>+5</button>
              <button onClick={() => props.updateTeamScore(team.id, 7)}>+7</button>
              <button onClick={() => props.updateTeamScore(team.id, 10)}>+10</button>
              <button
                className="mini-danger"
                onClick={() => props.updateTeamScore(team.id, -3)}
              >
                -3
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="primary-btn finish-round-btn" onClick={props.completeRound}>
        <Trophy size={18} />
        Finish Round
      </button>
    </motion.div>
  );
}

function LeaderboardScoreCard(props: {
  team: Team;
  rank: number;
  index: number;
  maxScore: number;
}) {
  const scoreWidth = `${Math.max(
    12,
    (Math.max(0, props.team.score) / props.maxScore) * 100
  )}%`;

  return (
    <motion.div
      className={`leaderboard-row ${props.rank === 1 ? "is-first" : ""}`}
      style={teamStyle(props.index)}
      layout
    >
      <div className="leaderboard-row-top">
        <span className="rank">{props.rank}</span>
        <div className="team-avatar">{getInitials(props.team.name)}</div>
        <div className="leaderboard-team-copy">
          <strong>{props.team.name}</strong>
          <span>{props.rank === 1 ? "Leading the room" : "Still in the fight"}</span>
        </div>
        <div className="score-cluster">
          <span className="score-number">{props.team.score}</span>
          <span className="score-label">pts</span>
        </div>
      </div>

      <div className="score-meter" aria-hidden="true">
        <div className="score-meter-fill" style={{ width: scoreWidth }} />
      </div>
    </motion.div>
  );
}

function LeaderboardRow(props: { team: Team; rank: number; index: number }) {
  return (
    <motion.div
      className={`leaderboard-row ${props.rank === 1 ? "is-first" : ""}`}
      style={teamStyle(props.index)}
      layout
    >
      <span className="rank">{props.rank === 1 ? "👑" : props.rank}</span>
      <div className="team-avatar">{getInitials(props.team.name)}</div>
      <strong>{props.team.name}</strong>
      <span className="score">{props.team.score}</span>
    </motion.div>
  );
}

void LeaderboardRow;

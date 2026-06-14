import { motion } from "framer-motion";
import { Play, Sparkles, Trophy, Vote } from "lucide-react";
import type React from "react";
import { DEFAULT_TEAMS } from "../../data/teamPresets";
import { TeamAvatar } from "../shared/TeamAvatar";

type HomeScreenProps = {
  isLoading: boolean;
  loadError: string | null;
  roomCodeInput: string;
  teamCodeInput: string;
  setRoomCodeInput: (value: string) => void;
  setTeamCodeInput: (value: string) => void;
  joinAsLeader: () => void;
  createRoom: () => void;
  shouldShowJoinFocus: boolean;
};

export function HomeScreen(props: HomeScreenProps) {
  return (
    <motion.main
      className="landing-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Live youth game platform</span>
          <h1>Bright, loud, phone-first fun for your next team night.</h1>
          <p>
            Create a room, launch voting or all-play rounds,
            score fast, and reveal a dramatic winner on the big screen.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={props.createRoom} disabled={props.isLoading}>
              <Play size={18} />
              {props.isLoading ? "Creating..." : "Host a Game"}
            </button>
          </div>

          <div className="hero-highlights">
            <InfoChip icon={<Vote size={16} />} text="Realtime voting" />
            <InfoChip icon={<Trophy size={16} />} text="Live leaderboard" />
            <InfoChip icon={<Sparkles size={16} />} text="Final round reveal" />
          </div>
        </div>

        <div
          className={`join-panel ${props.shouldShowJoinFocus ? "join-panel-focus" : ""}`}
        >
          <p className="section-kicker">Leader Join</p>
          <h2>Join from your phone</h2>
          <p>Scan the QR from the host or enter your room and team code.</p>

          <div className="join-team-preview-grid">
            {DEFAULT_TEAMS.map((team) => (
              <div
                className="join-team-preview"
                key={team.name}
                style={{ "--team-color": team.color } as React.CSSProperties}
              >
                <TeamAvatar emoji={team.avatarEmoji} image={team.avatarImage} name={team.name} />
                <div>
                  <strong>{team.name}</strong>
                  <span>{team.animal}</span>
                </div>
              </div>
            ))}
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
            <button onClick={props.joinAsLeader} disabled={props.isLoading}>
              {props.isLoading ? "Joining..." : "Join team"}
            </button>
          </div>

          {props.loadError && <p className="error-banner">{props.loadError}</p>}
        </div>
      </section>
    </motion.main>
  );
}

function InfoChip(props: { icon: React.ReactNode; text: string }) {
  return (
    <div className="info-chip">
      {props.icon}
      <span>{props.text}</span>
    </div>
  );
}

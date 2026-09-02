import { motion } from "framer-motion";
import { Play, QrCode, Sparkles, Trophy, Vote } from "lucide-react";
import type React from "react";

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
            Run a fast, whole-team game night: launch rounds, score fast,
            and reveal the winner on the big screen.
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
          <p>Enter the room code from the host, then your team's code.</p>

          <div className="join-form">
            <label>
              <span>Room code</span>
              <input
                placeholder="G6PYF"
                value={props.roomCodeInput}
                onChange={(event) =>
                  props.setRoomCodeInput(event.target.value.toUpperCase())
                }
              />
            </label>
            <label>
              <span>Team code</span>
              <input
                placeholder="L"
                value={props.teamCodeInput}
                onChange={(event) =>
                  props.setTeamCodeInput(event.target.value.toUpperCase())
                }
              />
            </label>
            <div className="join-actions-row">
              <button onClick={props.joinAsLeader} disabled={props.isLoading}>
                {props.isLoading ? "Joining..." : "Join Team"}
              </button>
              <span className="join-help"><QrCode size={16} /> Scan the host QR if it is on screen.</span>
            </div>
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

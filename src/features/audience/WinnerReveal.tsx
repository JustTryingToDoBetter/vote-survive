import { motion } from "framer-motion";
import eagleLoserVideo from "../../assets/losers/eagle_lose.mp4";
import lionLoserVideo from "../../assets/losers/lion_lose.mp4";
import sheepLoserVideo from "../../assets/losers/sheep_lose.mp4";
import tigerLoserVideo from "../../assets/losers/Tiger_lose.mp4";
import eagleWinnerVideo from "../../assets/winners/eagle.mp4";
import lionWinnerVideo from "../../assets/winners/lion.mp4";
import sheepWinnerVideo from "../../assets/winners/sheep.mp4";
import tigerWinnerVideo from "../../assets/winners/tiger.mp4";
import type { Team } from "../../lib/types";
import { TeamAvatar } from "../shared/TeamAvatar";

const winnerVideoByAnimal: Record<string, string> = {
  lions: lionWinnerVideo,
  lion: lionWinnerVideo,
  sheep: sheepWinnerVideo,
  tiger: tigerWinnerVideo,
  tigers: tigerWinnerVideo,
  eagle: eagleWinnerVideo,
  eagles: eagleWinnerVideo,
};

const loserVideoByAnimal: Record<string, string> = {
  lions: lionLoserVideo,
  lion: lionLoserVideo,
  sheep: sheepLoserVideo,
  tiger: tigerLoserVideo,
  tigers: tigerLoserVideo,
  eagle: eagleLoserVideo,
  eagles: eagleLoserVideo,
};

function getWinnerVideo(team: Team) {
  const keys = [team.animal, team.name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  for (const key of keys) {
    if (winnerVideoByAnimal[key]) return winnerVideoByAnimal[key];
  }

  return null;
}

function getLoserVideo(team: Team) {
  const keys = [team.animal, team.name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  for (const key of keys) {
    if (loserVideoByAnimal[key]) return loserVideoByAnimal[key];
  }

  return null;
}

function placeLabel(index: number, total: number) {
  if (index === total - 1) return "Last place";
  if (index === 0) return "1st place";
  if (index === 1) return "2nd place";
  if (index === 2) return "3rd place";
  return `${index + 1}th place`;
}

type WinnerRevealProps = {
  winner: Team;
  teams: Team[];
  reducedMotion: boolean;
};

export function WinnerReveal({ winner, teams, reducedMotion }: WinnerRevealProps) {
  const winnerVideo = getWinnerVideo(winner);
  const lastTeam = teams[teams.length - 1] ?? null;
  const loserVideo = lastTeam ? getLoserVideo(lastTeam) : null;
  const revealOrder = [...teams].reverse();

  return (
    <motion.section
      className="winner-panel final-reveal-stage"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <ConfettiBurst reducedMotion={reducedMotion} />
      <div className="final-reveal-header">
        <p className="section-kicker">Final scores</p>
        <h2>Last to first reveal</h2>
      </div>

      <div className="final-reveal-grid">
        <div className="final-reveal-list">
          {revealOrder.map((team, revealIndex) => {
            const originalIndex = teams.findIndex((entry) => entry.id === team.id);
            const isWinner = team.id === winner.id;
            const teamVideo = isWinner ? getWinnerVideo(team) : getLoserVideo(team);

            return (
              <motion.div
                className={`final-reveal-card ${isWinner ? "is-winner" : ""} ${
                  originalIndex === teams.length - 1 ? "is-last" : ""
                }`}
                key={team.id}
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reducedMotion ? 0 : revealIndex * 0.7 }}
              >
                <span>{placeLabel(originalIndex, teams.length)}</span>
                <div className="final-reveal-team">
                  <TeamAvatar
                    emoji={team.avatar_emoji ?? "⭐"}
                    image={team.avatar_image ?? ""}
                    name={team.name}
                  />
                  <strong>{team.name}</strong>
                </div>
                <b>{team.score} pts</b>
                {teamVideo ? (
                  <video
                    className="final-team-video"
                    src={teamVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <div className="final-team-video-placeholder">No video</div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="final-winner-feature"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : revealOrder.length * 0.7 }}
        >
          <TeamAvatar
            emoji={winner.avatar_emoji ?? "⭐"}
            image={winner.avatar_image ?? ""}
            name={winner.name}
            className="winner-avatar"
          />
          <div>
            <p className="section-kicker">Winner</p>
            <h3>{winner.name}</h3>
            <span>{winner.score} points</span>
          </div>
          {winnerVideo && (
            <video
              className="winner-video final-feature-video"
              src={winnerVideo}
              autoPlay
              loop
              muted
              playsInline
            />
          )}
          {lastTeam && loserVideo && (
            <video
              className="loser-video final-small-video"
              src={loserVideo}
              autoPlay
              loop
              muted
              playsInline
            />
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}

function ConfettiBurst({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <span key={index} style={{ "--delay": `${index * 80}ms` } as React.CSSProperties} />
      ))}
    </div>
  );
}

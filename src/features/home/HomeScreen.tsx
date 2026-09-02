import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Play,
  Radio,
  Smartphone,
  Sparkles,
  Trophy,
} from "lucide-react";
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
      className="landing-page landing-redesign"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <LandingHeader />
      <div className="landing-content">
        <HeroSection isLoading={props.isLoading} createRoom={props.createRoom} />
        <FeatureStrip />
        <LeaderJoinCard {...props} />
      </div>
    </motion.main>
  );
}

function LandingHeader() {
  return (
    <header className="landing-header">
      <BrandMark />
      <a className="leader-sign-in" href="#leader-join">
        Leader sign in <ArrowRight size={15} aria-hidden="true" />
      </a>
    </header>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Live Youth Game Platform">
      <span className="brand-icon"><Radio size={20} aria-hidden="true" /></span>
      <span className="brand-copy">
        <strong>Live Youth</strong>
        <small>Game Platform</small>
      </span>
    </div>
  );
}

function HeroSection(props: Pick<HomeScreenProps, "isLoading" | "createRoom">) {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <p className="landing-eyebrow">Live youth game platform</p>
      <h1 id="landing-title">
        Bright, loud,<br />
        <span className="phone-first">phone-first</span> fun<br />
        for your next<br />
        team night<span className="headline-dot">.</span>
      </h1>
      <p className="landing-description">
        Run a fast, whole-team game night: launch rounds, score fast, and reveal the winner on the big screen.
      </p>
      <button className="show-button" onClick={props.createRoom} disabled={props.isLoading}>
        <Play size={19} fill="currentColor" aria-hidden="true" />
        {props.isLoading ? "Creating..." : "Host a Game"}
      </button>
    </section>
  );
}

function FeatureStrip() {
  return (
    <section className="feature-strip" aria-label="Game features">
      <Feature icon={<Smartphone size={17} />} text="Realtime voting" />
      <Feature icon={<Trophy size={17} />} text="Live leaderboard" />
      <Feature icon={<Sparkles size={17} />} text="Final round reveal" />
    </section>
  );
}

function Feature(props: { icon: React.ReactNode; text: string }) {
  return <div className="landing-feature">{props.icon}<span>{props.text}</span></div>;
}

function LeaderJoinCard(props: HomeScreenProps) {
  return (
    <section
      id="leader-join"
      className={`leader-join-card ${props.shouldShowJoinFocus ? "join-panel-focus" : ""}`}
      aria-labelledby="leader-join-title"
    >
      <div className="leader-join-heading">
        <div>
          <p className="join-label">Leader Join</p>
          <h2 id="leader-join-title">Join from your phone</h2>
          <p>Enter the room code from the host, then your team&apos;s code.</p>
        </div>
        <Radio className="join-radio" size={31} aria-hidden="true" />
      </div>

      <form
        className="leader-join-form"
        onSubmit={(event) => {
          event.preventDefault();
          props.joinAsLeader();
        }}
      >
        <FormField
          id="room-code"
          label="Room code"
          placeholder="e.g. G6PYF"
          value={props.roomCodeInput}
          onChange={(value) => props.setRoomCodeInput(value.toUpperCase())}
        />
        <FormField
          id="team-code"
          label="Team code"
          placeholder="e.g. L"
          value={props.teamCodeInput}
          onChange={(value) => props.setTeamCodeInput(value.toUpperCase())}
        />
        <button className="show-button join-team-button" type="submit" disabled={props.isLoading}>
          {props.isLoading ? "Joining..." : "Join Team"}
        </button>
      </form>

      <p className="qr-helper"><Smartphone size={15} aria-hidden="true" /> Scan the host QR if it is on screen.</p>
      {props.loadError && <InlineError message={props.loadError} />}
    </section>
  );
}

function FormField(props: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="landing-field" htmlFor={props.id}>
      <span>{props.label}</span>
      <input
        id={props.id}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        autoCapitalize="characters"
      />
    </label>
  );
}

function InlineError({ message }: { message: string }) {
  return <p className="landing-error" role="alert" aria-live="polite"><AlertCircle size={17} />{message}</p>;
}

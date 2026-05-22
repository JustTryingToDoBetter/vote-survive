export type TeamStarter = {
  name: string;
  animal: string;
  avatarEmoji: string;
  avatarImage: string;
  color: string;
  tone: string;
};

export const DEFAULT_TEAMS: TeamStarter[] = [
  {
    name: "PathFinders",
    animal: "Lions",
    avatarEmoji: "🦁",
    avatarImage: "/teams/pathfinders-lion.png",
    color: "#f59e0b",
    tone: "Brave and bold",
  },
  {
    name: "The Chosen",
    animal: "Sheep",
    avatarEmoji: "🐑",
    avatarImage: "/teams/the-chosen-sheep.png",
    color: "#14b8a6",
    tone: "Calm and faithful",
  },
  {
    name: "Stripe Warriors",
    animal: "Tigers",
    avatarEmoji: "🐯",
    avatarImage: "/teams/rapha-tiger.png",
    color: "#f97316",
    tone: "Fierce and energetic",
  },
  {
    name: "S",
    animal: "Cows",
    avatarEmoji: "🐄",
    avatarImage: "/teams/purple-cow.png",
    color: "#8b5cf6",
    tone: "Fun and chaotic",
  },
];

export const AVATAR_EMOJI_OPTIONS = [
  "🦁",
  "🐑",
  "🐯",
  "🐄",
  "🦅",
  "🐼",
  "🐬",
  "🕊️",
];

export const TEAM_COLOR_OPTIONS = [
  "#f59e0b",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#22c55e",
  "#ec4899",
];

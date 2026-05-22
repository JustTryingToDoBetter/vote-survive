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
    name: "Pathfinders",
    animal: "Lion",
    avatarEmoji: "🦁",
    avatarImage: "",
    color: "#f59e0b",
    tone: "Brave and bold",
  },
  {
    name: "The Chosen",
    animal: "Sheep",
    avatarEmoji: "🐑",
    avatarImage: "",
    color: "#14b8a6",
    tone: "Calm and faithful",
  },
  {
    name: "Stripe Warriors",
    animal: "Tiger",
    avatarEmoji: "🐯",
    avatarImage: "",
    color: "#f97316",
    tone: "Fierce and energetic",
  },
  {
    name: "Eagles Wings",
    animal: "Eagle",
    avatarEmoji: "🦅",
    avatarImage: "",
    color: "#0ea5e9",
    tone: "Swift and soaring",
  },
];

export const TEAM_COLOR_OPTIONS = [
  "#f59e0b",
  "#14b8a6",
  "#f97316",
  "#0ea5e9",
  "#8b5cf6",
  "#ef4444",
  "#22c55e",
  "#ec4899",
];

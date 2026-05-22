import type { RoundDefinition, RoundType } from "../lib/types";

const votingPrompts = [
  "Which team would lose a wilderness survival challenge first?",
  "Which team would fold first in a pressure-cooker trivia moment?",
  "Which team talks big but might wobble under spotlight pressure?",
  "Which team should be sent into the pressure zone tonight?",
];

const twists = [
  "Twist: Crowd bonus. The loudest support gets +2.",
  "Twist: Mercy minute. The pressure team may swap one rival.",
  "Twist: Fast hands. Bonus points if answered in 10 seconds.",
  "Twist: Steady nerves. Any hesitation costs 1 point.",
];

const allPlayChallenges = [
  "Every team has 25 seconds to invent a chant from their team animal.",
  "Each team must build a one-freeze Bible scene with only body poses.",
  "Teams have 30 seconds to create a team slogan and shout it together.",
];

const bibleQuestions = [
  "Who built the ark?",
  "Who brought down Goliath?",
  "Who was swallowed by a great fish?",
  "Who interpreted Pharaoh's dreams?",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const roundTypeLabels: Record<RoundType, string> = {
  voting: "Voting Round",
  all_play: "All-Play Challenge",
  quiz_burst: "Quiz Burst",
  bible_speed: "Bible Speed Round",
  dance_battle: "Dance Battle",
  steal: "Steal Round",
  final_double: "Final Double Points",
};

export const roundTemplates: Record<RoundType, () => RoundDefinition> = {
  voting: () => ({
    type: "voting",
    title: "Pressure Vote",
    prompt: pickRandom(votingPrompts),
    challenge:
      "The most-voted team enters the pressure spotlight, but every team still competes for points.",
    instructions:
      "Leaders vote from their phones. Once locked, the host reveals the pressure team and runs the challenge.",
    scoringGuide:
      "Score every team after the challenge. Use presets for speed or add a custom bonus/penalty.",
    twist: pickRandom(twists),
    requiresVoting: true,
  }),
  all_play: () => ({
    type: "all_play",
    title: "Everybody In",
    prompt: "All teams must jump in for this one.",
    challenge: pickRandom(allPlayChallenges),
    instructions:
      "No voting. The host launches the round and all teams compete at once.",
    scoringGuide:
      "Award all teams. Great for participation, runner-up, and winner presets.",
    requiresVoting: false,
  }),
  quiz_burst: () => ({
    type: "quiz_burst",
    title: "Quiz Burst",
    prompt: "Quick answer pressure is on.",
    challenge: `Question: ${pickRandom(bibleQuestions)}`,
    instructions:
      "Host reads the question. Teams answer fast. Use scoring buttons as soon as answers land.",
    scoringGuide: "Fastest correct answer wins. Others can still receive effort points.",
    twist: pickRandom(twists),
    requiresVoting: false,
  }),
  bible_speed: () => ({
    type: "bible_speed",
    title: "Bible Speed Round",
    prompt: "Find it. Shout it. Own it.",
    challenge:
      "Teams race to find a Bible passage and read the key verse out loud.",
    instructions:
      "Host gives the reference and starts the timer. All teams compete together.",
    scoringGuide:
      "Use +10 for the fastest, +7 for close second, and +2 or +5 for the rest.",
    requiresVoting: false,
  }),
  dance_battle: () => ({
    type: "dance_battle",
    title: "Dance Battle",
    prompt: "Energy check. Who owns the room?",
    challenge:
      "Teams get 20 seconds to show their wildest celebration move when the music hits.",
    instructions:
      "No voting needed. Let each team perform and score for confidence, creativity, and crowd energy.",
    scoringGuide: "Best performance gets winner points. Crowd favorites can get effort bonuses too.",
    requiresVoting: false,
  }),
  steal: () => ({
    type: "steal",
    title: "Steal Round",
    prompt: "One team can snatch momentum.",
    challenge:
      "The pressure team faces a rival. If they win, they steal points. The host still scores every team.",
    instructions:
      "Use voting first to pick the pressure team, then let them choose a rival.",
    scoringGuide:
      "Award regular points, then use custom scoring if you want to reflect a steal bonus.",
    twist: "Twist: The chosen rival may answer first.",
    requiresVoting: true,
  }),
  final_double: () => ({
    type: "final_double",
    title: "Final Round",
    prompt: "Everything counts double now.",
    challenge:
      "All teams compete in one last dramatic showdown with doubled scoring.",
    instructions:
      "Host launches the final round. No voting. Score every team, then reveal the winner.",
    scoringGuide:
      "Every score action is doubled automatically in the final round.",
    twist: "Final twist: Big moments swing the leaderboard fast.",
    requiresVoting: false,
    isFinal: true,
  }),
};

export function buildRoundDefinition(roundType?: RoundType): RoundDefinition {
  const type =
    roundType ??
    pickRandom<RoundType>([
      "voting",
      "all_play",
      "quiz_burst",
      "bible_speed",
      "dance_battle",
      "steal",
    ]);

  return roundTemplates[type]();
}

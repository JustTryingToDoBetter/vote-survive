import type { RoundDefinition, RoundType } from "../lib/types";

const votingPrompts = [
  "Which team should be thrown into a 1v1 showdown tonight?",
  "Which team would crack first in a head-to-head pressure battle?",
  "Which team talks big but might wobble in a direct face-off?",
  "Which team should step into the pressure duel right now?",
];

const twists = [
  "Twist: Crowd bonus. The loudest support gets +2.",
  "Twist: Mercy minute. The pressure team may swap one rival.",
  "Twist: Fast hands. Bonus points if answered in 10 seconds.",
  "Twist: Steady nerves. Any hesitation costs 1 point.",
];

const allPlayChallenges = [
  "Split the room into 2v2 lanes. Each pair has 25 seconds to invent a chant from their team animal.",
  "Run back-to-back 2v2 freeze battles. Each duo builds a Bible scene using only body poses.",
  "Create two 2v2 matchups. Each pair has 30 seconds to make a slogan and deliver it loud.",
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
    title: "Pressure Duel Vote",
    prompt: pickRandom(votingPrompts),
    challenge:
      "The most-voted team enters a 1v1 showdown against a rival picked by the host or by score position.",
    instructions:
      "Leaders vote from their phones. Once locked, reveal the pressure team and match them into a direct duel.",
    scoringGuide:
      "Use winner and runner-up scoring for the duel, then give participation or bonus points to the rest.",
    twist: pickRandom(twists),
    requiresVoting: true,
  }),
  all_play: () => ({
    type: "all_play",
    title: "Tag-Team Clash",
    prompt: "This round runs as 2v2 matchups.",
    challenge: pickRandom(allPlayChallenges),
    instructions:
      "No voting. Pair teams into two 2v2 battles or run one featured 2v2 showdown at a time.",
    scoringGuide:
      "Score the winning duo high, the other duo as runner-up or effort, then add custom bonuses if needed.",
    requiresVoting: false,
  }),
  quiz_burst: () => ({
    type: "quiz_burst",
    title: "Quiz Burst Face-Off",
    prompt: "Two teams enter. One answer swings it.",
    challenge: `1v1 quick-fire question: ${pickRandom(bibleQuestions)}`,
    instructions:
      "Pick two teams to face off first, then rotate challengers or keep the winner on the floor.",
    scoringGuide:
      "Fastest correct answer wins the duel. Score the winner, runner-up, and any teams waiting for a follow-up round.",
    twist: pickRandom(twists),
    requiresVoting: false,
  }),
  bible_speed: () => ({
    type: "bible_speed",
    title: "Bible Speed Face-Off",
    prompt: "Find it. Shout it. Beat the team across from you.",
    challenge:
      "Run 1v1 or 2v2 Bible look-up races. Teams sprint to find a passage and read the key verse first.",
    instructions:
      "Host gives the reference, starts the timer, and calls one matchup at a time or two duos side by side.",
    scoringGuide:
      "Use winner, runner-up, and effort scoring based on each matchup result.",
    requiresVoting: false,
  }),
  dance_battle: () => ({
    type: "dance_battle",
    title: "Dance Battle Bracket",
    prompt: "Energy check. Pick your 1v1 or 2v2 showdown.",
    challenge:
      "Run a 1v1 captain battle or a 2v2 crew showdown when the music drops.",
    instructions:
      "No voting needed. Let the host call the bracket and score confidence, creativity, and crowd energy.",
    scoringGuide:
      "Winning act gets top points, losing act gets runner-up or effort points, and crowd favorites can earn a bonus.",
    requiresVoting: false,
  }),
  steal: () => ({
    type: "steal",
    title: "Steal Duel",
    prompt: "One 1v1 battle can swing the room.",
    challenge:
      "The pressure team faces a rival in a 1v1 duel. If they win, they steal momentum and maybe extra points.",
    instructions:
      "Use voting first to pick the pressure team, then match them against one rival for the steal attempt.",
    scoringGuide:
      "Award normal winner and runner-up points, then use a custom score if you want to add the steal bonus.",
    twist: "Twist: The chosen rival may answer first.",
    requiresVoting: true,
  }),
  final_double: () => ({
    type: "final_double",
    title: "Final Round",
    prompt: "Everything counts double now.",
    challenge:
      "Run one last dramatic set of 1v1 or 2v2 showdowns with doubled scoring.",
    instructions:
      "Host launches the final round, chooses the final matchups, scores every team, then reveals the winner.",
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

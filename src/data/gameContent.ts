// src/data/gameContent.ts
export const DEFAULT_TEAMS = [
  "Team Blaze",
  "Team Courage",
  "Team Radiant",
  "Team Victory",
];

export const votingQuestions = [
  "Which team should get the pressure penalty this round?",
  "Which team looks most likely to flop this challenge?",
  "Which team should start with the hardest version of the challenge?",
  "Which team should get exposed this round?",
  "Which team has been talking the most and needs to prove it?",
  "Which team should go first under pressure?",
  "Which team needs to back up their confidence?",
  "Which team should receive the chaos card?",
];

export const allPlayChallenges = [
  {
    title: "Team Chant Battle",
    description:
      "Every team gets 30 seconds to create a chant. Loudest and most creative team wins.",
    scoringHint: "1st +10, 2nd +7, 3rd +5, everyone else +2",
  },
  {
    title: "Bible Freeze Frame",
    description:
      "Every team must create a frozen Bible scene. Host chooses the best scene.",
    scoringHint: "Best scene +10, funniest +7, clearest Bible story +5, participation +2",
  },
  {
    title: "Youth Advert Battle",
    description:
      "Every team makes a 20-second advert inviting people to youth.",
    scoringHint: "Best advert +10, best slogan +7, funniest +5, participation +2",
  },
  {
    title: "No-Laugh Face-Off",
    description:
      "Each team sends one player. Players try not to laugh while others perform.",
    scoringHint: "Last standing +10, second +7, third +5, participation +2",
  },
  {
    title: "Speed Acting",
    description:
      "Every team acts out the same Bible story. Best performance wins.",
    scoringHint: "Best acting +10, funniest +7, most accurate +5, participation +2",
  },
  {
    title: "Quick Quiz Burst",
    description:
      "Every team answers the same Bible/general knowledge question. Fastest correct answers score highest.",
    scoringHint: "Fastest +10, second +7, third +5, correct participation +2",
  },
  {
    title: "Human Statue",
    description:
      "Every team builds a human statue called 'Champions Under Pressure'.",
    scoringHint: "Best statue +10, most creative +7, funniest +5, participation +2",
  },
  {
    title: "Dance Battle",
    description:
      "Every team gets 20 seconds to perform a celebration dance.",
    scoringHint: "Best dance +10, best energy +7, funniest +5, participation +2",
  },
];

export const pressureTwists = [
  "Pressure Penalty: The most-voted team must perform first.",
  "Chaos Card: The most-voted team only gets 20 seconds to prepare.",
  "Comeback Card: The last-place team gets +3 bonus points if they commit fully.",
  "Double Energy: Host may award +3 bonus points for the loudest team.",
  "Steal Chance: The winning team may steal 2 points from the most-voted team.",
  "Mercy Round: Every team gets at least 2 points if they participate.",
];

export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function buildRoundContent() {
  const challenge = randomItem(allPlayChallenges);
  const twist = randomItem(pressureTwists);

  return {
    question: randomItem(votingQuestions),
    challenge: `${challenge.title}: ${challenge.description} | Scoring: ${challenge.scoringHint} | Twist: ${twist}`,
  };
}
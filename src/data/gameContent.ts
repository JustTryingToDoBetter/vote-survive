export const DEFAULT_TEAMS = [
  "Team Blaze",
  "Team Courage",
  "Team Radiant",
  "Team Victory",
];

export const votingQuestions = [
  "Which team would crack first under pressure?",
  "Which team is most likely to fumble the final round?",
  "Which team needs a miracle to survive this challenge?",
  "Which team talks big but might fold tonight?",
  "Which team would lose a wilderness survival challenge?",
  "Which team is most likely to get distracted by snacks?",
  "Which team would panic first in a Bible sword drill?",
  "Which team should be sent into the challenge arena?",
  "Which team looks confident but is secretly nervous?",
  "Which team would get eliminated first in a youth camp challenge?",
  "Which team has the weakest celebration dance?",
  "Which team would forget the rules immediately after hearing them?",
];

export const challenges = [
  "Battle Round: The voted team chooses a rival. Both teams have 30 seconds to create the best team chant.",
  "Steal Round: The voted team challenges one rival. Winner steals 3 points from the loser.",
  "Pressure Round: The voted team has 45 seconds to act out a Bible story. If they fail, another team may steal.",
  "Face-Off: The voted team chooses one rival for a 20-second dance battle. Crowd decides the winner.",
  "Quick Preach: One player from the voted team must preach for 30 seconds on why their team deserves to win.",
  "No-Laugh Battle: The voted team picks a rival. Each team sends one player. First to laugh loses.",
  "Bible Freeze Frame: The voted team and a rival must create a frozen Bible scene. Best scene wins.",
  "Ad Battle: The voted team picks a rival. Both teams make a 20-second advert for Youth Night.",
  "Rap Battle: The voted team challenges a rival to a 4-line rap about their team name.",
  "Speed Build: The voted team makes a human statue called 'Champions Under Pressure'.",
];

export const quizBursts = [
  {
    prompt: "Quiz Burst: Who built the ark?",
    answer: "Noah",
  },
  {
    prompt: "Quiz Burst: Who defeated Goliath?",
    answer: "David",
  },
  {
    prompt: "Quiz Burst: Who was swallowed by a great fish?",
    answer: "Jonah",
  },
  {
    prompt: "Quiz Burst: Who interpreted Pharaoh's dreams?",
    answer: "Joseph",
  },
  {
    prompt: "Quiz Burst: Who denied Jesus three times?",
    answer: "Peter",
  },
];

export const twistCards = [
  "Reverse Vote: The team with the least votes enters the arena.",
  "Double Points: This challenge is worth double.",
  "All Play: Every team must compete. Best team wins.",
  "Mercy Card: The voted team may pass, but loses 2 points.",
  "Rival Pick: The voted team chooses who they battle.",
  "Steal Card: Winner steals 3 points from another team.",
];

export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function buildRoundContent() {
  const shouldUseQuizBurst = Math.random() < 0.25;
  const twist = Math.random() < 0.35 ? randomItem(twistCards) : null;

  if (shouldUseQuizBurst) {
    const quiz = randomItem(quizBursts);

    return {
      question: "Vote for the team that should answer the Quiz Burst under pressure.",
      challenge: `${quiz.prompt} Answer: ${quiz.answer}${twist ? ` | Twist: ${twist}` : ""}`,
    };
  }

  return {
    question: randomItem(votingQuestions),
    challenge: `${randomItem(challenges)}${twist ? ` | Twist: ${twist}` : ""}`,
  };
}
export type TeamChallengeCategory = "bible" | "memory" | "teamwork" | "speed" | "strategy";

export type TeamChallengeDefinition = {
  id: string;
  title: string;
  category: TeamChallengeCategory;
  description: string;
  instructions: string;
  scoringNote?: string;
};

/** Every eligible teammate takes a meaningful turn or contributes to the team result. */
export const teamChallenges: TeamChallengeDefinition[] = [
  { id: "bible-book-chain", title: "Bible Book Chain", category: "bible", description: "Name Bible books in a chain without repeating one.", instructions: "Start one team at a time. A new teammate names the next book on every turn. Stop a team when they repeat, pause for 3 seconds, or give an invalid answer." },
  { id: "bible-hunt-relay", title: "Bible Hunt Relay", category: "bible", description: "Find four Bible references as a relay.", instructions: "Give every team the same four references. Player 1 finds the first, then tags Player 2. Continue until all four are found; first correct finish wins." },
  { id: "rapid-fire-rotation", title: "Rapid Fire Rotation", category: "bible", description: "Answer quick Bible questions, one teammate at a time.", instructions: "Read questions for 45 seconds. Rotate to the next teammate after every answer. Nobody answers twice until every eligible teammate has had a turn." },
  { id: "event-order", title: "Timeline Scramble", category: "bible", description: "Put Bible events in the correct order.", instructions: "Give each team the same mixed-up event cards. Every teammate places or checks at least one card. Check the completed timelines; first correct one wins." },
  { id: "verse-puzzle", title: "Verse Scramble", category: "bible", description: "Rebuild a scrambled verse and name its reference.", instructions: "Give each team the same verse pieces. Every teammate places or checks a piece. First team with the correct verse and reference wins." },
  { id: "memory-table", title: "Memory Rush", category: "memory", description: "Remember the most items from a board.", instructions: "Show every team the same board for 15 seconds, then hide it. Each teammate contributes to one team list. Count only correct items." },
  { id: "silent-line", title: "Silent Line-Up", category: "teamwork", description: "Line up correctly without speaking.", instructions: "Give all teams the same ordering rule, such as birthday month or Bible-book order. Teams may not speak. Check each full line; first correct team wins." },
  { id: "three-clue-character", title: "Who Am I?", category: "bible", description: "Identify a Bible character from clues.", instructions: "Read one clue at a time. Teams discuss every clue, then write one answer together. Reveal the answer after teams submit." },
  { id: "category-blitz", title: "Category Blitz", category: "speed", description: "Name as many valid answers from one Bible category as possible.", instructions: "Give every team the same category and 30 seconds. Teammates rotate answers. Do not count repeats or invalid answers; highest valid total wins." },
  { id: "answer-board", title: "Lock It In", category: "strategy", description: "Discuss one question and submit one team answer.", instructions: "Read the same question to every team. Give them time to discuss, then have each team lock one answer. Reveal all answers together." },
  { id: "bible-connect", title: "Connect", category: "bible", description: "Explain the link between two Bible people, places, or events.", instructions: "Give every team the same pair. Teams build one explanation together, then submit it. Check the explanations and score the correct ones." },
  { id: "four-corners", title: "Choose Your Corner", category: "speed", description: "Choose the correct answer by moving as a team.", instructions: "Assign four answers to four areas of the room. Read the question, let teams discuss, then have every teammate move to their team's answer before time ends." },
  { id: "team-code", title: "Crack the Code", category: "strategy", description: "Solve clues and combine the answers into one final code.", instructions: "Give every team the same clue set. Teams split the clues between members, combine their answers, and submit one final code. First complete correct code wins." },
];

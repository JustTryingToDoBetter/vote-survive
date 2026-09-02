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
  { id: "bible-book-chain", title: "Bible Book Chain", category: "bible", description: "Name Bible books in order without repeating one.", instructions: "Start both teams with Genesis. Teams take turns; a different teammate must give the next book each turn. A team is out when they repeat, pause for 3 seconds, or name a book out of order. Last team still correct wins." },
  { id: "bible-hunt-relay", title: "Bible Hunt Relay", category: "bible", description: "Find four Bible references as a relay.", instructions: "Give every team: Genesis 6:14, Exodus 20:12, Psalm 23:1, and John 3:16. Player 1 finds the first reference, then tags Player 2. Continue until all four are found; first correct finish wins." },
  { id: "rapid-fire-rotation", title: "Rapid Fire Rotation", category: "bible", description: "Answer quick Bible questions, one teammate at a time.", instructions: "Ask: Who built the ark? Who led Israel out of Egypt? Who defeated Goliath? Who was swallowed by a great fish? Rotate after every answer; nobody answers twice until everyone has had a turn. Most correct answers wins." },
  { id: "event-order", title: "Timeline Scramble", category: "bible", description: "Put Bible events in the correct order.", instructions: "Give each team these mixed cards: Jesus is born, David defeats Goliath, Noah builds the ark, Moses leads Israel out of Egypt. Every teammate places or checks one card. First correct order wins." },
  { id: "verse-puzzle", title: "Verse Scramble", category: "bible", description: "Rebuild a scrambled verse and name its reference.", instructions: "Give teams these pieces: “is my shepherd”, “The Lord”, “I shall not want.” Every teammate places or checks a piece. First team to rebuild Psalm 23:1 correctly wins." },
  { id: "memory-table", title: "Memory Rush", category: "memory", description: "Remember the most items from a board.", instructions: "Show this list for 15 seconds: ark, rainbow, sling, fish, stone, crown, scroll, lamp. Hide it. Each teammate contributes an item to the team list; most correct items wins." },
  { id: "silent-line", title: "Silent Line-Up", category: "teamwork", description: "Line up correctly without speaking.", instructions: "Teams line up from earliest to latest birthday month without speaking. Every teammate must be in the line. First team in the correct order wins." },
  { id: "three-clue-character", title: "Who Am I?", category: "bible", description: "Identify a Bible character from three clues.", instructions: "Read: “I was a shepherd. I defeated Goliath. I became king.” Teams discuss, then write one answer together. Reveal David after every team has locked an answer." },
  { id: "category-blitz", title: "Category Blitz", category: "speed", description: "Name as many valid answers from one Bible category as possible.", instructions: "Category: books of the New Testament. Give teams 30 seconds. Teammates rotate answers; repeats and invalid answers do not count. Highest valid total wins." },
  { id: "answer-board", title: "Lock It In", category: "strategy", description: "Discuss one question and submit one team answer.", instructions: "Ask: “Which city’s walls fell after Israel marched around them?” Teams discuss, then write one answer together. Reveal Jericho after every team has locked an answer." },
  { id: "bible-connect", title: "Connect", category: "bible", description: "Explain the link between two Bible people, places, or events.", instructions: "Give every team: Noah and a rainbow. Teams build one sentence together. Accept: “God gave the rainbow as a sign of his covenant after the flood.” Every teammate contributes before the answer is submitted." },
  { id: "four-corners", title: "Choose Your Corner", category: "speed", description: "Choose the correct answer by moving as a team.", instructions: "Label corners Noah, Moses, David, and Peter. Ask: “Who built the ark?” Teams discuss, then every teammate moves to their answer. The correct corner is Noah." },
  { id: "team-code", title: "Crack the Code", category: "strategy", description: "Solve clues and combine the answers into one final code.", instructions: "Give clues: ark builder, giant-slayer, great-fish prophet, first king of Israel. Teams split the clues, then submit the initials N-D-J-S. First complete correct code wins." },
];

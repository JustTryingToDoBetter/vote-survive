import type {
  QuizDifficulty,
  QuizQuestion,
  RoundDefinition,
  RoundType,
} from "../lib/types";
import { teamChallenges } from "./teamChallenges";


// ---------------------------------------------------------------------------
// ALL-PLAY CHALLENGES
// ---------------------------------------------------------------------------

export const legacyAllPlayChallenges = [
  // Physical / Energy
  "Run back-to-back 2v2 freeze battles. Each duo builds a Bible scene using only body poses.",
  "Create two 2v2 matchups. Each pair has 30 seconds to make a slogan and deliver it loud.",
  "All teams at the same time: 30 seconds to come up with a team handshake and perform it perfectly.",
  "Each team has 45 seconds to build a human sculpture that represents one of the Fruits of the Spirit.",
  "2v2 charades: Act out a Bible miracle without speaking. Rival team has 20 seconds to guess.",
  "Every team performs a 15-second hype intro for themselves — crowd energy judged by the host.",
  "One person from each team mimes a Bible character. Their team shouts guesses. First to 3 correct wins.",

  // Creative / Speaking
  "Each team has 30 seconds to write and deliver a one-line rap about their team animal.",
  "Teams compete to create the best 30-second motivational speech using only three words: Coffee, Gym, and Jesus",


  // Knowledge / Speed
  "All teams race to name as many books of the Bible as possible in 30 seconds. Host counts, top total wins.",
  "4-team simultaneous quiz: Host reads a question, first team to stand wins the point. 5 questions, fast fire.",
  "Name chain: Teams take turns — each team must name a Bible character whose name starts with the last letter of the previous answer.",
  "2v2 speed round: Which team can correctly order 5 Bible events chronologically first? Host reads them out.",
  "Phone-free scavenger sprint: teams have 25 seconds to bring the host one shoe, one Bible, and one person who knows Psalm 23.",
  "Youth group weather report: each team gives a dramatic forecast for Jonah's boat trip. Most committed performance wins.",
  "Silent disco directions: one teammate silently acts out a Bible story while the team guesses. Fastest clean guess wins.",
  "Snack sermon: teams get 30 seconds to preach a mini-message using an imaginary packet of chips as the object lesson.",
  "Freeze-frame trailer: build three still scenes that tell David and Goliath like a movie trailer.",
  "Choir chaos: teams have 20 seconds to turn their team name into a worship-conference-style chant.",
  "Reverse charades: the whole team acts while the leader guesses the Bible character.",
  "Emoji testimony: teams describe a Bible story using only faces, gestures, and dramatic pointing.",
  "Awkward handshake altar call: invent the most complicated team handshake that still looks clean.",
  "Speed compliment battle: teams have 20 seconds to hype another team without repeating any adjective.",
  "Lost announcement challenge: each team announces a missing sandal like it is the most important news of the night.",
  "One-word sermon relay: each person adds exactly one word to build a dramatic sentence about courage.",
];

export const legacyAllPlayPrompts = [
  "Every team is live. Everybody has a job.",
  "All teams compete at the same time — nobody sits this one out.",
  "Whole-team challenge: work together, rotate, and finish first.",
  "The entire room is playing. Every eligible teammate contributes.",
];

const quizBurstPrompts = [
  "Fast facts. Fast reactions. Quick points.",
  "The room moves in a blitz of Bible knowledge.",
  "Answer fast, lock early, and hold your nerve.",
  "Quiz burst: speed wins the room.",
  "A lightning round of Bible knowledge is under way.",
];

const bibleSpeedPrompts = [
  "Find the verse quickly, then answer with confidence.",
  "The room is racing through Bible references now.",
  "Quick recall wins this speed sprint.",
  "Every team is chasing the right reference in real time.",
  "Bible speed: find it first and finish strong.",
];

const twists = [
  "Rotation rule: no teammate may take a second turn until everyone on the eligible team has participated.",
  "Whole-team rule: every eligible teammate must contribute before anyone repeats.",
];

const showdownChallengeIds = new Set([
  "bible-book-chain",
  "bible-hunt-relay",
  "event-order",
  "memory-table",
  "silent-line",
  "category-blitz",
  "verse-puzzle",
]);

const finalChallengeIds = new Set([
  "bible-hunt-relay",
  "category-blitz",
  "event-order",
  "team-code",
]);

const activeShowdownChallenges = teamChallenges.filter((challenge) =>
  showdownChallengeIds.has(challenge.id)
);
const activeFinalChallenges = teamChallenges.filter((challenge) =>
  finalChallengeIds.has(challenge.id)
);

// ---------------------------------------------------------------------------
// QUIZ BURST QUESTIONS
// ---------------------------------------------------------------------------

export const legacyBibleQuestions = [
  // Easy — Old Testament
  "Who built the ark?",
  "Who brought down Goliath?",
  "Who was swallowed by a great fish?",
  "Who interpreted Pharaoh's dreams?",
  "Which king asked God for wisdom instead of riches?",
  "Who led the Israelites out of Egypt?",
  "What were the names of the first two humans?",
  "In which garden did Adam and Eve sin?",
  "How many days and nights did it rain during Noah's flood?",
  "Who was thrown into the lions' den?",
  "What did God do on the seventh day of creation?",
  "Who were Jacob's twelve sons the ancestors of?",
  "What weapon did Samson use to defeat the Philistines?",
  "Who was Moses' brother?",
  "Which city's walls fell after the Israelites marched around it?",

  // Medium — Old Testament
  "Name the three friends of Daniel who were thrown into the fiery furnace.",
  "What book of the Bible contains the Ten Commandments?",
  "Who anointed David as king?",
  "Which tribe was King Saul from?",
  "What did Elijah call down from heaven to defeat the prophets of Baal?",
  "Who was Boaz's wife and what book tells their story?",
  "How many Psalms are in the Bible?",
  "What does the name 'Emmanuel' mean?",
  "Who was the first judge of Israel mentioned in the book of Judges?",
  "What river did Naaman wash in to be healed of leprosy?",

  // Easy — New Testament
  "How many disciples did Jesus choose?",
  "Where was Jesus born?",
  "Who baptised Jesus?",
  "What miracle did Jesus perform at the wedding in Cana?",
  "Who denied Jesus three times?",
  "Who wrote the most books in the New Testament?",
  "What sea did Jesus walk on?",
  "Who was the tax collector Jesus called to follow Him?",
  "What did Jesus feed 5000 people with?",
  "According to John 20, who first saw the risen Jesus?",

  // Medium — New Testament
  "Name the two prisoners released or kept at Passover — which did the crowd choose?",
  "In which town did Jesus grow up?",
  "Who was Saul of Tarsus before he became Paul?",
  "What is the shortest verse in the Bible?",
  "Which book of the Bible describes the armour of God?",
  "Who had a dream about Jesus' innocence during His trial?",
  "How many days was Lazarus in the tomb before Jesus raised him?",
  "What does the word 'Gospel' mean?",
  "Which two disciples ran to the empty tomb?",
  "Name the fruit of the Spirit — all nine.",

  // Hard / Bonus
  "What is the main message of John 3:16?",
  "What are the four Gospels in order?",
  "Which prophet said 'For I know the plans I have for you'?",
  "In Revelation, what are the seven churches of Asia listed?",
  "What were the plagues of Egypt — name at least six.",
  "What does 'Selah' mean and where does it appear?",
  "Which two books of the Bible do not mention God by name?",
  "What is the last word in the Bible?",
  "Name the beatitudes — how many are there and list them.",
  "Who wrote Lamentations and what was happening at the time?",
];

type MultipleChoiceQuestion = {
  question: string;
  correctAnswer: string;
  options: string[];
};

const multipleChoiceQuestions: MultipleChoiceQuestion[] = [
  {
    question: "Who built the ark?",
    correctAnswer: "Noah",
    options: ["Noah", "Moses", "David", "Abraham"],
  },
  {
    question: "Where was Jesus born?",
    correctAnswer: "Bethlehem",
    options: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"],
  },
  {
    question: "Who brought down Goliath?",
    correctAnswer: "David",
    options: ["David", "Saul", "Samson", "Joshua"],
  },
  {
    question: "Who was swallowed by a great fish?",
    correctAnswer: "Jonah",
    options: ["Jonah", "Elijah", "Daniel", "Peter"],
  },
  {
    question: "How many disciples did Jesus choose?",
    correctAnswer: "12",
    options: ["7", "10", "12", "40"],
  },
  {
    question: "Who denied Jesus three times?",
    correctAnswer: "Peter",
    options: ["Peter", "John", "Thomas", "Judas"],
  },
  {
    question: "Which king asked God for wisdom?",
    correctAnswer: "Solomon",
    options: ["Solomon", "David", "Saul", "Hezekiah"],
  },
  {
    question: "What sea did Jesus walk on?",
    correctAnswer: "Sea of Galilee",
    options: ["Sea of Galilee", "Dead Sea", "Red Sea", "Mediterranean Sea"],
  },
  {
    question: "Who climbed a tree to see Jesus?",
    correctAnswer: "Zacchaeus",
    options: ["Zacchaeus", "Nicodemus", "Bartimaeus", "Matthew"],
  },
  {
    question: "Who was thrown into the lions' den?",
    correctAnswer: "Daniel",
    options: ["Daniel", "Joseph", "Elisha", "Nehemiah"],
  },
  {
    question: "Who led the Israelites out of Egypt?",
    correctAnswer: "Moses",
    options: ["Moses", "Joshua", "Aaron", "Caleb"],
  },
  {
    question: "What did Jesus feed the 5000 with?",
    correctAnswer: "Five loaves and two fish",
    options: ["Five loaves and two fish", "Manna", "Seven loaves", "Bread and wine"],
  },
  {
    question: "Who was Ruth's mother-in-law?",
    correctAnswer: "Naomi",
    options: ["Naomi", "Hannah", "Miriam", "Esther"],
  },
  {
    question: "What was Paul's name before his conversion?",
    correctAnswer: "Saul",
    options: ["Saul", "Simon", "Stephen", "Silas"],
  },
  {
    question: "Who interpreted Pharaoh's dreams?",
    correctAnswer: "Joseph",
    options: ["Joseph", "Daniel", "Moses", "Samuel"],
  },
  {
    question: "What was the first miracle of Jesus?",
    correctAnswer: "Turning water into wine",
    options: ["Turning water into wine", "Healing a blind man", "Feeding 5000", "Walking on water"],
  },
  {
    question: "Which prophet challenged the prophets of Baal on Mount Carmel?",
    correctAnswer: "Elijah",
    options: ["Elijah", "Elisha", "Isaiah", "Jeremiah"],
  },
  {
    question: "Who was queen and helped save her people?",
    correctAnswer: "Esther",
    options: ["Esther", "Deborah", "Ruth", "Abigail"],
  },
  {
    question: "What happened on the seventh day of creation?",
    correctAnswer: "God rested",
    options: ["God rested", "God made light", "God made people", "God made birds"],
  },
  {
    question: "Who was Jesus' earthly father?",
    correctAnswer: "Joseph",
    options: ["Joseph", "Zechariah", "Simeon", "Jacob"],
  },
  {
    question: "Who baptised Jesus?",
    correctAnswer: "John the Baptist",
    options: ["John the Baptist", "Peter", "Andrew", "James"],
  },
  {
    question: "Which disciple was a tax collector?",
    correctAnswer: "Matthew",
    options: ["Matthew", "Philip", "Thomas", "Jude"],
  },
  {
    question: "Who asked Jesus how to be born again?",
    correctAnswer: "Nicodemus",
    options: ["Nicodemus", "Zacchaeus", "Pilate", "Cornelius"],
  },
  {
    question: "Who prayed in a fish?",
    correctAnswer: "Jonah",
    options: ["Jonah", "Noah", "Job", "Joel"],
  },
  {
    question: "Who became king after Saul?",
    correctAnswer: "David",
    options: ["David", "Solomon", "Samuel", "Jonathan"],
  },
  {
    question: "Who was the first martyr in Acts?",
    correctAnswer: "Stephen",
    options: ["Stephen", "James", "Peter", "Paul"],
  },
  {
    question: "Which book comes after the Gospel of John?",
    correctAnswer: "Acts",
    options: ["Acts", "Romans", "Luke", "Revelation"],
  },
  {
    question: "What is the last book of the Bible?",
    correctAnswer: "Revelation",
    options: ["Revelation", "Jude", "Malachi", "Romans"],
  },
];

const bibleSpeedQuestions: MultipleChoiceQuestion[] = [
  {
    question: "Which reference says, 'The Lord is my shepherd'?",
    correctAnswer: "Psalm 23:1",
    options: ["Psalm 23:1", "Psalm 46:10", "John 3:16", "Romans 8:28"],
  },
  {
    question: "Which reference says, 'Jesus wept'?",
    correctAnswer: "John 11:35",
    options: ["John 11:35", "Luke 2:52", "Mark 1:1", "Acts 2:42"],
  },
  {
    question: "Which reference says, 'I can do all things through Christ'?",
    correctAnswer: "Philippians 4:13",
    options: ["Philippians 4:13", "Ephesians 6:10", "Romans 12:2", "James 1:5"],
  },
  {
    question: "Which reference says, 'Be still, and know that I am God'?",
    correctAnswer: "Psalm 46:10",
    options: ["Psalm 46:10", "Psalm 1:1", "Proverbs 3:5", "Isaiah 40:31"],
  },
  {
    question: "Which reference says, 'For God so loved the world'?",
    correctAnswer: "John 3:16",
    options: ["John 3:16", "John 1:1", "Romans 5:8", "1 John 4:8"],
  },
  {
    question: "Which reference says, 'Trust in the Lord with all your heart'?",
    correctAnswer: "Proverbs 3:5",
    options: ["Proverbs 3:5", "Psalm 119:11", "Joshua 1:9", "Matthew 6:33"],
  },
  {
    question: "Which reference says, 'Seek first his kingdom'?",
    correctAnswer: "Matthew 6:33",
    options: ["Matthew 6:33", "Matthew 5:9", "Luke 15:7", "John 14:6"],
  },
  {
    question: "Which reference says, 'Do not conform to the pattern of this world'?",
    correctAnswer: "Romans 12:2",
    options: ["Romans 12:2", "Romans 8:1", "Galatians 5:22", "Colossians 3:23"],
  },
  {
    question: "Which reference says, 'Love is patient, love is kind'?",
    correctAnswer: "1 Corinthians 13:4",
    options: ["1 Corinthians 13:4", "2 Corinthians 5:17", "1 John 3:16", "Hebrews 11:1"],
  },
  {
    question: "Which reference says, 'In the beginning God created'?",
    correctAnswer: "Genesis 1:1",
    options: ["Genesis 1:1", "Exodus 1:1", "John 1:1", "Psalm 1:1"],
  },
  {
    question: "Which reference says, 'The Lord is my light and my salvation'?",
    correctAnswer: "Psalm 27:1",
    options: ["Psalm 27:1", "Psalm 91:1", "Psalm 121:1", "Psalm 139:14"],
  },
  {
    question: "Which reference says, 'Your word is a lamp for my feet'?",
    correctAnswer: "Psalm 119:105",
    options: ["Psalm 119:105", "Psalm 100:4", "Psalm 34:8", "Psalm 19:1"],
  },
  {
    question: "Which reference says, 'Faith is confidence in what we hope for'?",
    correctAnswer: "Hebrews 11:1",
    options: ["Hebrews 11:1", "James 2:17", "Romans 10:17", "Ephesians 2:8"],
  },
  {
    question: "Which reference says, 'The fruit of the Spirit is love, joy, peace'?",
    correctAnswer: "Galatians 5:22",
    options: ["Galatians 5:22", "Ephesians 4:29", "Colossians 3:12", "Romans 5:5"],
  },
  {
    question: "Which reference says, 'Put on the full armour of God'?",
    correctAnswer: "Ephesians 6:11",
    options: ["Ephesians 6:11", "Ephesians 2:10", "Philippians 2:5", "1 Timothy 4:12"],
  },
  {
    question: "Which reference says, 'Let no one despise your youth'?",
    correctAnswer: "1 Timothy 4:12",
    options: ["1 Timothy 4:12", "2 Timothy 1:7", "Titus 2:7", "1 Peter 3:15"],
  },
];

// ---------------------------------------------------------------------------
// BIBLE SPEED ROUND PASSAGES
// ---------------------------------------------------------------------------

export const legacyBibleSpeedChallenges = [
  "Race: Find and read Jeremiah 29:11 first.",
  "Race: Find and read Romans 8:28 first.",
  "Race: Find and read Philippians 4:13 first.",
  "Race: Find and read Psalm 23:1 first.",
  "Race: Find and read John 11:35 first — easiest verse, fastest hands win.",
  "Race: Find and read Proverbs 3:5-6 first.",
  "Race: Find and read Isaiah 40:31 first.",
  "Race: Find and read 1 Corinthians 13:4 first.",
  "Race: Find and read Matthew 6:33 first.",
  "Race: Find and read Joshua 1:9 first.",
  "Race: Find and read Psalm 46:10 first.",
  "Race: Find and read Romans 12:2 first.",
  "Race: Find and read Ephesians 6:10-11 first.",
  "Race: Find and read Genesis 1:1 first — sounds easy, don't fumble.",
  "Race: Find and read Revelation 21:4 first.",
  "Race: Find and read Psalm 119:105 first.",
  "Race: Find and read Galatians 5:22-23 first.",
  "Race: Find and read Hebrews 11:1 first.",
  "Race: Find and read 1 Timothy 4:12 first.",
  "Race: Find and read Matthew 5:14 first.",
  "Race: Find and read James 1:5 first.",
  "Race: Find and read 2 Timothy 1:7 first.",
  "Race: Find and read John 14:6 first.",
  "Race: Find and read Romans 5:8 first.",
  "Race: Find and read Colossians 3:23 first.",
  "Race: Find and read 1 Peter 5:7 first.",
  "Race: Find and read Micah 6:8 first.",
];



// ---------------------------------------------------------------------------
// STEAL ROUND PROMPTS
// ---------------------------------------------------------------------------

export const legacyStealChallenges = [
  "KINGSLAYER: The pressure team challenges the team in 1st place. Win one sudden-death challenge and steal 8 points. Lose and the leaders steal 3 from you.",

  "THE HEIST: Pick any rival team and announce how many points you want to steal: 3, 5, or 8. The higher the steal, the harder the host makes the challenge. Fail and you pay half the attempted steal.",

  "ALL OR NOTHING: Challenge any team above you for 10 points. Winner takes the full 10. There is no runner-up reward.",

  "ROBBIN' HOOD: Last place challenges first place. If last place wins, they steal 4 points from first place AND receive 2 points from every other team.",

  "BOUNTY HUNTER: The host secretly places a 7-point bounty on one team. The pressure team chooses an opponent before the bounty is revealed. Pick the bounty team and win? Steal 10 instead.",

  "POINTS AUCTION: The pressure team secretly wagers 1–8 points. Their opponent does the same. Reveal both wagers. Winner steals the combined wager from the loser.",

  "CAPTAIN'S RANSOM: Captains face each other in sudden death. Winner may steal 6 points OR force the losing captain to sit out the next challenge.",

  "DOUBLE OR DISASTER: Attempt the challenge for a 5-point steal. After winning, choose: keep the 5 or immediately risk it in a second challenge for a 12-point steal. Lose the second challenge and return everything.",

  "THE VAULT: Three mini-challenges stand between the pressure team and 12 stolen points. Clear Challenge 1 for 3, Challenge 2 for another 4, Challenge 3 for another 5. They may cash out after any win.",

  "HIGHWAY ROBBERY: The pressure team gets 30 seconds to beat THREE other teams in rapid-fire Bible questions. Every team they beat loses 3 points to them.",

  "REVENGE RECEIPT: Challenge the team that most recently beat you. Winning steals 7 points. If you lost points to them earlier tonight, steal an extra 2.",

  "THE SETUP: The pressure team chooses two rival teams to battle each other. Before they start, predict the winner. Correct prediction steals 4 points from BOTH teams. Wrong prediction costs 3.",

  "HOSTAGE POINTS: Choose a rival and lock 8 of their points. They must win the next challenge to keep them. If they lose, the pressure team takes all 8.",

  "SNAKE EYES: Roll or randomly generate a number from 1–6. That number becomes the steal value. Roll a 6 and the steal doubles to 12 — but failure costs 6.",

  "THE TRAITOR: The pressure team chooses one player from a rival team to represent BOTH teams in a challenge. If that player succeeds, their original team keeps 5 points. If they fail, the pressure team steals 5.",

  "LAST TEAM STANDING: Every team sends one player into a rapid elimination challenge. Each elimination transfers 2 points from the eliminated player's team to whoever knocked them out. Last survivor gets an extra 5.",

  "CHAIN ROBBERY: Challenge any team for 4 points. Win and choose another team immediately for a second 4-point steal. Keep winning and keep going. One loss ends the chain.",

  "THE UNTOUCHABLES: The current leader must defend against every other team in rapid succession. Each challenger who beats them steals 3 points. If the leader survives everyone, they gain 6.",

  "SWITCHEROO: Beat a rival in a challenge and choose between stealing 7 points OR swapping your entire score with theirs. The choice must be made BEFORE the challenge begins.",

  "MYSTERY BOX: The pressure team chooses Box A, B, or C before the challenge. Hidden rewards are +3, +7, and +12 steal points. The host reveals their box only AFTER they accept the challenge.",

  "BANK BREAKER: Pick the richest team on the scoreboard. Beat them and steal 20% of their current score, rounded to the nearest whole point. Lose and give them 5.",

  "EVERYBODY'S AN OP: The pressure team plays against the entire room. One challenge. If they win, steal 2 points from EVERY team. If anyone beats them, that team steals 5 from the pressure team.",

  "THE GETAWAY: Win a challenge to steal 5. Then survive a 10-second bonus challenge to escape with the points. Fail the getaway and the victim gets their 5 back.",

  "BACKSTAB: Two teams secretly choose another team to steal from. If both target the same team, they must battle each other first. Winner gets exclusive rights to attempt the 8-point steal.",

  "THE DEBT COLLECTOR: The lowest-scoring team selects one rival. Every correct answer in a 30-second quiz transfers 2 points from that rival. No maximum until time expires.",

  "BIBLE BOSS FIGHT: Challenge first place to a best-of-3 Bible showdown. Each question is worth 3 stolen points. Win all three and receive a 5-point sweep bonus.",

  "THE GAUNTLET: The pressure team names three opponents. They face them one after another. First win steals 3, second steals 5, third steals 8. Lose once and the run ends.",

  "PROTECT THE KING: First place chooses another team as their protector. The pressure team must beat the protector before they can challenge first place for an 8-point steal. Beat both and earn a 4-point bonus.",

  "UNO REVERSE: The pressure team attempts a 7-point steal. Before the challenge starts, the targeted team may yell 'REVERSE' and turn the challenge back on them. The original pressure team cannot refuse.",

  "THE COUP: Every team except first place participates. If ANY challenger beats first place, first place loses 3 points to every team that defeated them. If first place beats everyone, they gain 8.",

  "SUDDEN DEATH JACKPOT: Start at a 2-point steal. Every correct answer doubles the pot: 2 → 4 → 8 → 16. Stop whenever you want. One wrong answer loses the entire pot and gives the opponent 4.",

  "WANTED: The host announces one challenge and every team secretly writes down how many points they would risk to enter. Highest bidder gets the challenge. Win and steal the bid from any team. Lose and pay the bid to last place.",

  "THE GREAT ESCAPE: The pressure team steals 8 points immediately — but the victim gets one challenge to chase them down. If the victim wins, they recover the 8 and steal 4 extra.",

  "DOMINO EFFECT: Steal 5 from one team. That team then gets an immediate chance to steal 5 from someone else. Continue until somebody loses a challenge or every team has played.",

  "PICKPOCKET: Before seeing the challenge, choose one rival and secretly choose 3, 6, or 9 points. Complete the challenge and take them. Fail and the target takes the same amount from you.",

  "FINAL BOSS: The lowest-ranked team challenges the current leader. The trailing team chooses the challenge category. The leader chooses who represents each team. Winner steals 10.",
];

const stealChallenges = [
  {
    title: "Bible Hunt Raid",
    description: "Find four Bible references as a relay.",
    instructions: "Give both teams the same four references. Each teammate finds one before tagging the next player. First correct finish wins.",
  },
  {
    title: "Code Break",
    description: "Solve clues and combine the answers into one final code.",
    instructions: "Give both teams the same clue set. Teams split the clues between members, combine the answers, and submit one final code. First complete correct code wins.",
  },
  {
    title: "Category Blitz",
    description: "Name as many valid answers from one Bible category as possible.",
    instructions: "Give both teams the same category and 30 seconds. Teammates rotate answers. Do not count repeats or invalid answers; highest valid total wins.",
  },
  {
    title: "Verse Vault",
    description: "Rebuild a scrambled verse and name its reference.",
    instructions: "Give both teams the same verse pieces. Everyone helps arrange or check a piece. First correct verse and reference wins.",
  },
  {
    title: "Memory Raid",
    description: "Remember the most items from a board.",
    instructions: "Show both teams the same board for 15 seconds, then hide it. Each teammate contributes to one team list. Count only correct items.",
  },
];

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function getQuizDifficulty(index: number, total: number): QuizDifficulty {
  const position = total <= 1 ? 0 : index / (total - 1);
  if (position < 0.4) return "easy";
  if (position < 0.8) return "medium";
  return "hard";
}

export function buildQuizQuestionSet(roundType: RoundType, count = 5): QuizQuestion[] {
  const timeLimitSeconds = roundType === "bible_speed" ? 20 : 15;
  const questionBank =
    roundType === "bible_speed" ? bibleSpeedQuestions : multipleChoiceQuestions;
  const category =
    roundType === "bible_speed" ? "bible_reference" : "bible_knowledge";

  return shuffle(
    questionBank.map((question, bankIndex) => ({ question, bankIndex }))
  )
    .slice(0, count)
    .map(({ question, bankIndex }, index) => ({
      id: `${roundType}-${index + 1}-${question.correctAnswer.toLowerCase().replace(/\W+/g, "-")}`,
      prompt: question.question,
      options: shuffle(question.options),
      correctAnswer: question.correctAnswer,
      category,
      difficulty: getQuizDifficulty(bankIndex, questionBank.length),
      timeLimitSeconds,
      points: 5,
    }));
}

// ---------------------------------------------------------------------------
// ROUND TYPE LABELS
// ---------------------------------------------------------------------------

export const roundTypeLabels: Record<RoundType, string> = {
  voting: "Showdown",
  all_play: "Challenge",
  quiz_burst: "Quiz Burst",
  bible_speed: "Bible Speed",
  dance_battle: "Dance Battle",
  steal: "Steal",
  final_double: "Final",
};

export const playableRoundTypes = [
  "all_play",
  "voting",
  "steal",
  "final_double",
] as const satisfies readonly RoundType[];

// ---------------------------------------------------------------------------
// PUBLIC ENTRY POINT
// ---------------------------------------------------------------------------

export function buildRoundDefinition(roundType?: RoundType): RoundDefinition {
  const type = roundType ?? pickRandom<RoundType>(["all_play", "voting", "steal"]);

  switch (type) {
    case "voting":
      {
        const selectedChallenge = pickRandom(activeShowdownChallenges);
      return {
        type,
        title: selectedChallenge.title,
        prompt: "Two whole teams. One winner.",
        challenge: selectedChallenge.description,
        instructions: selectedChallenge.instructions,
        scoringGuide: "Winner +10. Other team +5.",
        requiresVoting: true,
      };
      }

    case "all_play": {
      const selectedChallenge = pickRandom(teamChallenges);
      return {
        type,
        title: selectedChallenge.title,
        prompt: "All teams are in.",
        challenge: selectedChallenge.description,
        instructions: selectedChallenge.instructions,
        scoringGuide: "Host scores teams using the standard score controls.",
        requiresVoting: false,
      };
    }

    case "quiz_burst": {
      const questionSet = buildQuizQuestionSet(type);
      const question = questionSet[0];
      return {
        type,
        title: "Quiz Burst Face-Off",
        prompt: pickRandom(quizBurstPrompts),
        challenge: question.prompt,
        instructions:
          "Run each question fast. Start the question, lock answers, score, then jump straight to the next one.",
        scoringGuide:
          "Fastest correct earns +10 total. Every other correct team earns +5. Wrong answers earn 0.",
        twist: pickRandom(twists),
        requiresVoting: false,
        answerOptions: question.options,
        correctAnswer: question.correctAnswer,
        questionSet,
        currentQuestionIndex: 0,
        questionStatus: "waiting",
      };
    }

    case "bible_speed": {
      const questionSet = buildQuizQuestionSet(type);
      const question = questionSet[0];
      return {
        type,
        title: "Bible Speed Face-Off",
        prompt: pickRandom(bibleSpeedPrompts),
        challenge: question.prompt,
        instructions:
          "Run quick Bible questions from the host screen. Leaders answer from phones and the host advances immediately.",
        scoringGuide:
          "Fastest correct earns +10 total. Every other correct team earns +5. Wrong answers earn 0.",
        requiresVoting: false,
        answerOptions: question.options,
        correctAnswer: question.correctAnswer,
        questionSet,
        currentQuestionIndex: 0,
        questionStatus: "waiting",
      };
    }

    case "steal":
      {
        const selectedChallenge = pickRandom(stealChallenges);
      return {
        type,
        title: selectedChallenge.title,
        prompt: "Win and take 5.",
        challenge: selectedChallenge.description,
        instructions: selectedChallenge.instructions,
        scoringGuide:
          "Pressure-team win steals up to 5 points from the rival. Rival win blocks the steal.",
        requiresVoting: true,
      };
      }

    case "final_double":
      {
        const selectedChallenge = pickRandom(activeFinalChallenges);
      return {
        type,
        title: selectedChallenge.title,
        prompt: "Everyone plays. Every point counts double.",
        challenge: selectedChallenge.description,
        instructions: selectedChallenge.instructions,
        scoringGuide:
          "Use normal host scoring. All score changes are doubled automatically.",
        requiresVoting: false,
        isFinal: true,
      };
      }
    default:
      return buildRoundDefinition("voting");
  }
}

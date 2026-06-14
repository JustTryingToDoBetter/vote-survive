import type { QuizQuestion, RoundDefinition, RoundType } from "../lib/types";

// ---------------------------------------------------------------------------
// VOTING PROMPTS
// ---------------------------------------------------------------------------

const votingPrompts = [
  "Which team should be thrown into a 1v1 showdown tonight?",
  "Which team would crack first in a head-to-head pressure battle?",
  "Which team talks big but might wobble in a direct face-off?",
  "Which team should step into the pressure duel right now?",
  "Which team has been too quiet — time to put them in the spotlight?",
  "Which team looks like they need a little pressure to wake up?",
  "Which team has been saving their energy for this exact moment?",
  "Which team do you want to see fight for their life tonight?",
  "Which team do you trust to represent under pressure?",
  "Which team has been coasting and needs to earn their points?",
  "Which team's leader has that look like they're ready to go?",
  "Which team has the most to prove right now?",
  "Who do you send into battle when everything is on the line?",
  "Which team would you least want to face in a 1v1 — vote them in!",
  "Which team has been the loudest? Time to back it up.",
  "Which team has been moving like main characters all night?",
  "Which team looks way too comfortable right now?",
  "Which team should prove their confidence was not just volume?",
  "Which team has the biggest comeback energy?",
  "Which team would survive a surprise challenge with absolutely no prep?",
  "Which team needs a loving public wake-up call?",
  "Which team has been quietly plotting and needs to be exposed?",
  "Which team should take the next big swing?",
  "Which team is one challenge away from either glory or chaos?",
  "Which team leader has been acting like they are built different?",
  "Which team deserves the pressure because they can actually handle it?",
  "Which team would make the funniest highlight reel under pressure?",
  "Which team has been too safe and needs to risk something?",
  "Which team should defend their honour right now?",
  "Which team is ready for a youth-night legend moment?",
];

const votingChallenges = [
  "The most-voted team enters a 1v1 showdown against a rival picked by the host.",
  "The most-voted team faces the current leaderboard leader in a pressure duel.",
  "The most-voted team must nominate one rival and beat them in a fast challenge.",
  "The most-voted team gets 30 seconds to defend themselves before the host calls the matchup.",
  "The most-voted team plays a sudden-death round. Winner earns points, loser takes a penalty.",
  "The most-voted team steps into the spotlight and the host chooses their exact task live.",
];

const allPlayPrompts = [
  "This round runs across the whole room.",
  "Everyone is active. No hiding this round.",
  "All teams play at the same time.",
  "Full-room chaos. Host judges the cleanest execution.",
];

const quizBurstPrompts = [
  "Two teams enter. One answer swings it.",
  "Fastest correct answer takes control.",
  "Hands up, brains on, no hesitation.",
  "One question can flip the scoreboard.",
];

const bibleSpeedPrompts = [
  "Find it. Shout it. Beat the team across from you.",
  "Fast hands win this one.",
  "Open the Bible and move quickly.",
  "The first clean read gets the edge.",
];

const danceBattlePrompts = [
  "Energy check. Pick your showdown.",
  "The room decides who brought the fire.",
  "Confidence, creativity, and timing matter.",
  "Send your boldest mover forward.",
];

const finalChallenges = [
  "Run one last dramatic set of 1v1 or 2v2 showdowns with doubled scoring. Make it count.",
  "Every team gets one final moment. Host scores big swings only.",
  "The top two teams face off, then the rest fight for placement points.",
  "One final all-play challenge decides the scoreboard. Scores are doubled.",
  "Captains step forward for a final pressure test. Every score action counts double.",
  "Final Pack: Captain Gauntlet. Each leader faces one speed question, one acting prompt, and one courage challenge. Score every moment double.",
  "Final Pack: Redemption Relay. Last place chooses the first matchup, winners keep advancing, and every score action counts double.",
  "Final Pack: Crowd Court. Teams perform a 20-second defence speech, then complete one host-picked challenge. Host scores confidence and execution double.",
  "Final Pack: Bible Boss Rush. Run five rapid Bible questions, then one final sudden-death question for the top two teams. Double every award.",
  "Final Pack: Team Legacy. Each team gets 30 seconds to create a chant, a pose, and a one-line testimony-style hype moment. Score big swings double.",
  "Final Pack: Chaos Ladder. Start with the lowest score team challenging anyone above them. A win lets them climb and score double.",
  "Final Pack: The Last Stand. Top team must defend their lead in a 1v1, while trailing teams fight for one final double-points steal.",
];

// ---------------------------------------------------------------------------
// TWISTS
// ---------------------------------------------------------------------------

const twists = [
  "Twist: Crowd bonus. The loudest support gets +2.",
  "Twist: Mercy minute. The pressure team may swap one rival.",
  "Twist: Fast hands. Bonus points if answered in 10 seconds.",
  "Twist: Steady nerves. Any hesitation costs 1 point.",
  "Twist: Double or nothing. The pressure team can wager 5 of their points.",
  "Twist: Tag in. Mid-round, the leader can swap themselves for any teammate.",
  "Twist: Steal window. If the losing team answers after the winner, they snatch 3 points.",
  "Twist: Crowd vote. The audience votes thumbs up/down after the performance — host adds up to +3.",
  "Twist: Silent start. First 5 seconds must be performed in complete silence.",
  "Twist: Rematch clause. Losing team can immediately call a rematch — one time only.",
  "Twist: Mystery judge. Host picks one random person from the room to be the deciding judge.",
  "Twist: Momentum swing. If the trailing team wins, they earn double the normal points.",
  "Twist: Confidence tax. Before the round, each team secretly bids 1–5 points. Loser pays it out.",
  "Twist: Captain only. Only the team leader may perform or answer for this round.",
  "Twist: Lightning finish. Last 10 seconds only — whoever scores in that window gets +3.",
];

// ---------------------------------------------------------------------------
// ALL-PLAY CHALLENGES
// ---------------------------------------------------------------------------

const allPlayChallenges = [
  // Physical / Energy
  "Split the room into 2v2 lanes. Each pair has 25 seconds to invent a chant from their team animal.",
  "Run back-to-back 2v2 freeze battles. Each duo builds a Bible scene using only body poses.",
  "Create two 2v2 matchups. Each pair has 30 seconds to make a slogan and deliver it loud.",
  "All teams at the same time: 30 seconds to come up with a team handshake and perform it perfectly.",
  "Each team has 45 seconds to build a human sculpture that represents one of the Fruits of the Spirit.",
  "2v2 charades: Act out a Bible miracle without speaking. Rival team has 20 seconds to guess.",
  "Every team performs a 15-second hype intro for themselves — crowd energy judged by the host.",
  "One person from each team mimes a Bible character. Their team shouts guesses. First to 3 correct wins.",

  // Creative / Speaking
  "Each team has 30 seconds to write and deliver a one-line rap about their team animal.",
  "Teams compete to create the best 20-second motivational speech using only three words: Faith, Fire, and Fight.",
  "2v2 debate battle: Teams argue opposite sides of 'Is it harder to be Daniel or Joseph?' — 30 seconds each side.",
  "Each team rewrites a well-known worship song chorus using their team name. 45 seconds. Perform it.",
  "Speed storytelling: Each team member says one sentence to continue a story about David and Goliath. Must make sense.",
  "Pair off into 2v2s. Each pair has 20 seconds to come up with the best Bible-inspired team motto.",

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
  "What did God create on the seventh day?",
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
  "Who was the first person to see Jesus after the resurrection?",

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
  "Quote John 3:16 word for word.",
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
// DANCE BATTLE FORMATS
// ---------------------------------------------------------------------------

const danceBattleChallenges = [
  "Run a 1v1 captain battle or a 2v2 crew showdown when the music drops.",
  "Each team sends one person. 15 seconds each. Crowd energy decides the winner.",
  "2v2 crew battle: 20 seconds per team, judged on creativity, energy, and sync.",
  "Freeze battle: Music stops randomly — last person still frozen when it restarts is out.",
  "Mirror battle: Two people face off. One leads, one mirrors. Host switches leader mid-battle.",
  "Slow-mo battle: Entire performance must be in exaggerated slow motion. Creativity wins.",
  "Style swap: Each team picks a ridiculous style (ballet, robot, grandpa) for the opponent to battle in.",
  "Team sync challenge: All members of each team must move in perfect unison for 15 seconds.",
  "Chair-free musical statues: music stops, everyone freezes in a Bible-character pose. Host eliminates the wobblers.",
  "Worship intro remix: teams create a 10-second walk-on move like they are entering a youth camp stage.",
  "Bible scene dance-off: one team dances 'walls of Jericho', the other dances 'storm on the boat'. Host judges clarity and courage.",
  "Invisible prop battle: each team must dance with an imaginary object chosen by the host.",
];

// ---------------------------------------------------------------------------
// STEAL ROUND PROMPTS
// ---------------------------------------------------------------------------

const stealChallenges = [
  "The pressure team faces a rival in a 1v1 duel. If they win, they steal momentum and maybe extra points.",
  "Pressure team picks their rival. Win the duel and steal 5 points directly off the rival's score.",
  "The team with the most votes faces the current leaderboard leader in a steal attempt.",
  "If the pressure team wins, they steal 3 points from every other team simultaneously.",
  "Pressure team vs. host's pick. Winner takes 7 points. Loser gives up 3.",
  "Last-place team is the pressure team — this is their comeback duel. Steal window is wide open.",
  "Steal Sprint: trailing team calls out any team above them. One Bible speed question decides a 6-point steal.",
  "Receipt Check: the pressure team gets 20 seconds to explain why they deserve another team's points, then must win a quick challenge to take them.",
  "Double Dare Steal: pressure team can attempt an easy task for +3 or a harder task for +8 from one rival.",
  "Captain Snatch: leaders face a sudden-death quiz. Winner steals 5 from the loser.",
  "Crowd Noise Steal: teams perform a 10-second hype chant. Host picks winner; winner steals 4 from any team.",
  "Reverse Steal: the targeted rival can block the steal by answering first. If they miss, the pressure team takes 7.",
  "Mercy Steal: last-place team gets one clean shot to steal 5 from first place. No penalty if they lose.",
  "Risky Receipt: team may steal 10, but if they fail the challenge they give 5 to the target.",
  "Tag-Team Theft: pressure team chooses one teammate and one rival teammate for a 2v2 mini challenge. Winner steals 6.",
  "Bible Backup Steal: answer the first question for +3, then choose to stop or risk it for a 7-point steal.",
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

export function buildQuizQuestionSet(roundType: RoundType, count = 5): QuizQuestion[] {
  const timeLimitSeconds = roundType === "bible_speed" ? 20 : 15;
  const questionBank =
    roundType === "bible_speed" ? bibleSpeedQuestions : multipleChoiceQuestions;

  return shuffle(questionBank)
    .slice(0, count)
    .map((question, index) => ({
      id: `${roundType}-${index + 1}-${question.correctAnswer.toLowerCase().replace(/\W+/g, "-")}`,
      prompt: question.question,
      options: shuffle(question.options),
      correctAnswer: question.correctAnswer,
      timeLimitSeconds,
      points: 5,
    }));
}

// ---------------------------------------------------------------------------
// ROUND TYPE LABELS
// ---------------------------------------------------------------------------

export const roundTypeLabels: Record<RoundType, string> = {
  voting: "Voting Round",
  all_play: "All-Play Challenge",
  quiz_burst: "Quiz Burst",
  bible_speed: "Bible Speed Round",
  dance_battle: "Dance Battle",
  steal: "Steal Round",
  final_double: "Final Double Points",
};

// ---------------------------------------------------------------------------
// PUBLIC ENTRY POINT
// ---------------------------------------------------------------------------

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

  switch (type) {
    case "voting":
      return {
        type,
        title: "Pressure Duel Vote",
        prompt: pickRandom(votingPrompts),
        challenge: pickRandom(votingChallenges),
        instructions:
          "Leaders vote from their phones. Once locked, reveal the pressure team and match them into a direct duel.",
        scoringGuide:
          "Use winner and runner-up scoring for the duel, then give participation or bonus points to the rest.",
        twist: pickRandom(twists),
        requiresVoting: true,
      };

    case "all_play":
      return {
        type,
        title: "Tag-Team Clash",
        prompt: pickRandom(allPlayPrompts),
        challenge: pickRandom(allPlayChallenges),
        instructions:
          "No voting. Pair teams into two 2v2 battles or run one featured 2v2 showdown at a time.",
        scoringGuide:
          "Score the winning duo high, the other duo as runner-up or effort, then add custom bonuses if needed.",
        requiresVoting: false,
      };

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
          "Fastest correct can earn +10. Each correct team can earn +5.",
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
          "Fastest correct can earn +10. Each correct team can earn +5.",
        requiresVoting: false,
        answerOptions: question.options,
        correctAnswer: question.correctAnswer,
        questionSet,
        currentQuestionIndex: 0,
        questionStatus: "waiting",
      };
    }

    case "dance_battle":
      return {
        type,
        title: "Dance Battle Bracket",
        prompt: pickRandom(danceBattlePrompts),
        challenge: pickRandom(danceBattleChallenges),
        instructions:
          "No voting needed. Let the host call the bracket and score confidence, creativity, and crowd energy.",
        scoringGuide:
          "Winning act gets top points, losing act gets runner-up or effort points, and crowd favourites can earn a bonus.",
        requiresVoting: false,
      };

    case "steal":
      return {
        type,
        title: "Steal Duel",
        prompt: "One 1v1 battle can swing the entire room.",
        challenge: pickRandom(stealChallenges),
        instructions:
          "Use voting first to pick the pressure team, then match them against one rival for the steal attempt.",
        scoringGuide:
          "Award normal winner and runner-up points, then use a custom score if you want to add the steal bonus.",
        twist: pickRandom(twists),
        requiresVoting: true,
      };

    case "final_double":
      return {
        type,
        title: "Final Round",
        prompt: "Everything counts double now. This is where legends are made.",
        challenge: pickRandom(finalChallenges),
        instructions:
          "Host launches the final round, chooses the final matchups, scores every team, then reveals the winner.",
        scoringGuide:
          "Every score action is doubled automatically in the final round. No holding back.",
        twist: pickRandom(twists),
        requiresVoting: false,
        isFinal: true,
      };
  }
}

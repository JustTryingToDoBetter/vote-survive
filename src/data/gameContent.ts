// src/data/gameContent.ts
export const votingQuestions = [
  "Vote for the team most likely to survive in the wilderness.",
  "Vote for the team most likely to start laughing during prayer.",
  "Vote for the team most likely to become famous.",
  "Vote for the team most likely to win a dance battle.",
  "Vote for the team most likely to eat everyone’s snacks.",
  "Vote for the team most likely to become president.",
  "Vote for the team most likely to get lost using Google Maps.",
  "Vote for the team most likely to be late to their own wedding.",
  "Vote for the team most likely to talk their way out of trouble.",
  "Vote for the team most likely to accidentally break something."
];

export const challenges = [
  "Create a 20-second team victory dance.",
  "Act out David and Goliath in 30 seconds.",
  "Sing one worship song chorus dramatically.",
  "Create a team handshake in 45 seconds.",
  "Act like animals entering Noah’s Ark.",
  "Do a slow-motion action scene.",
  "Make a 4-line rap about your team name.",
  "Create a frozen scene from a Bible story.",
  "Sell an imaginary product called Holy Water 3000.",
  "Create a 30-second advert inviting people to youth."
];

export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
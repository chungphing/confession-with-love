import { randomUUID } from "node:crypto";
import { Confession } from "@confession/shared";

const MESSAGES = [
  "I still think about you every single day.",
  "You make ordinary moments feel like magic.",
  "I never told you, but you changed my life.",
  "Wish I had said this in person: I miss you.",
  "The best part of my day is seeing your name.",
  "Thank you for being my calm in the chaos.",
  "I loved you then, I love you now.",
  "You are the reason I believe in second chances.",
  "One day I'll be brave enough to say this out loud.",
  "You were my favorite hello and my hardest goodbye.",
];

export function buildSeed(): Confession[] {
  const now = Date.now();
  const coords = [
    [500, 500],
    [502, 501],
    [498, 499],
    [505, 495],
    [495, 505],
    [510, 500],
    [500, 510],
    [488, 512],
    [512, 488],
    [520, 480],
  ];

  return coords.map(([x, y], i) => ({
    id: randomUUID(),
    txId: `seed-${i}`,
    x,
    y,
    message: MESSAGES[i],
    createdAt: now - i * 60_000,
    reactions: {
      "❤️": 18 + ((i * 7) % 40),
      "😂": 3 + ((i * 13) % 22),
      "😮": (i * 5) % 9,
      "🔥": (i * 11) % 15,
    },
  }));
}

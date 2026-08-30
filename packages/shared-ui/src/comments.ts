export interface Comment {
  id: string;
  author: string;
  hue: number;
  text: string;
  createdAt: number;
  parentId: string | null;
}

const AUTHORS = [
  "moonlit_squirrel",
  "quiet_avocado",
  "teatime_ghost",
  "slow_moon",
  "amber_walrus",
  "midnight_toast",
  "pocket_phoenix",
  "paper_crane",
  "saltwater_fern",
  "velvet_comet",
  "tiny_umbrella",
  "cloud_reader",
  "honey_badger",
  "wandering_pine",
  "dim_candle",
  "rusted_compass",
  "purple_orchard",
  "foggy_railway",
  "silent_guitar",
  "lucky_papaya",
  "northern_lights",
  "sugar_ant",
  "bicycle_daydream",
  "gentle_avalanche",
];

const TEXTS = [
  "This hit me harder than I expected. Sending good energy your way.",
  "I've felt this before. It does get easier, slowly.",
  "Beautifully put. Thank you for writing it down.",
  "Okay this is scarily relatable.",
  "Wishing you healing and peace, stranger.",
  "I read this three times. Wow.",
  "It's brave to say this out loud, even here.",
  "Same. Same, same, same.",
  "Whoever you are, you're not alone in this.",
  "This deserves way more hearts.",
  "I needed to see this today.",
  "Keep going. It's worth it.",
  "That's exactly what I couldn't find the words for.",
  "Sending a hug through the internet.",
  "I hope your person reads this someday.",
  "Your honesty is a gift. Take care of yourself.",
  "This place has a way of making strangers feel seen.",
  "I'm rooting for you.",
  "Screenshotting this because I need the reminder.",
  "The courage here is real. Respect.",
  "Sometimes strangers understand us best.",
  "This is why I keep coming back to this grid.",
  "May this confession be heard by exactly who it needs to be.",
  "Oof. Right in the feels.",
  "You matter, even if it doesn't feel like it right now.",
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function toHue(str: string): number {
  return hash(str) % 360;
}

export function formatRelativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

export function generateComments(seed: string): Comment[] {
  const rand = mulberry32(hash(seed));
  const now = Date.now();
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const inRange = (min: number, max: number): number =>
    Math.floor(min + rand() * (max - min + 1));

  const comments: Comment[] = [];
  let id = 0;
  const used = new Set<string>();

  const makeText = (): string => {
    let t = pick(TEXTS);
    let guard = 0;
    while (used.has(t) && guard < 8) {
      t = pick(TEXTS);
      guard++;
    }
    used.add(t);
    return t;
  };

  const topLevel = inRange(34, 40);
  for (let i = 0; i < topLevel; i++) {
    const author = pick(AUTHORS);
    const baseTs = now - inRange(2, 11) * DAY - inRange(0, 23) * HOUR;
    const parentId = `demo-${seed}-${id}`;
    comments.push({
      id: parentId,
      author,
      hue: toHue(author),
      text: makeText(),
      createdAt: baseTs,
      parentId: null,
    });
    id++;

    const replyCount = rand() < 0.72 ? inRange(1, 5) : 0;
    for (let r = 0; r < replyCount; r++) {
      const replyAuthor = pick(AUTHORS);
      const ts = baseTs + inRange(1, 8) * HOUR + inRange(0, 59) * MINUTE;
      const replyId = `demo-${seed}-${id}`;
      comments.push({
        id: replyId,
        author: replyAuthor,
        hue: toHue(replyAuthor),
        text: makeText(),
        createdAt: ts,
        parentId,
      });
      id++;

      if (rand() < 0.35) {
        const nestedAuthor = pick(AUTHORS);
        const nestedId = `demo-${seed}-${id}`;
        comments.push({
          id: nestedId,
          author: nestedAuthor,
          hue: toHue(nestedAuthor),
          text: makeText(),
          createdAt: ts + inRange(1, 20) * MINUTE,
          parentId: replyId,
        });
        id++;

        if (rand() < 0.25) {
          const deepAuthor = pick(AUTHORS);
          comments.push({
            id: `demo-${seed}-${id}`,
            author: deepAuthor,
            hue: toHue(deepAuthor),
            text: makeText(),
            createdAt: ts + inRange(1, 10) * HOUR,
            parentId: nestedId,
          });
          id++;
        }
      }
    }
  }

  return comments;
}

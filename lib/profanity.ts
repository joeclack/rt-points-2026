// Keep this list in sync with the database guard in migration 007.
const blockedTerms = new Set([
  "arsehole",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "cunt",
  "dickhead",
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "nigga",
  "nigger",
  "piss",
  "prick",
  "shit",
  "shithead",
  "slut",
  "twat",
  "wanker",
  "whore",
]);

const substitutions: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};

function normalizedTokens(value: string) {
  const normalized = Array.from(value.toLowerCase().normalize("NFKD"))
    .map((character) => substitutions[character] ?? character)
    .join("")
    .replace(/[\u0300-\u036f]/g, "");

  return normalized.match(/[a-z]+/g) ?? [];
}

export function containsProfanity(value: string) {
  return normalizedTokens(value).some((token) => blockedTerms.has(token));
}

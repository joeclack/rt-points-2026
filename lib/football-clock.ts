import type { FootballMatch } from "@/lib/football-types";

export type FootballClock = {
  addedTime: boolean;
  clockLabel: string;
  periodLabel: "First half" | "Second half";
};

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getFootballClock(
  match: FootballMatch,
  matchMinutes: number,
  now = Date.now(),
): FootballClock | null {
  if (match.status !== "live") {
    return null;
  }

  const isSecondHalf = Boolean(match.secondHalfStartedAt);
  const periodStartedAt = isSecondHalf
    ? match.secondHalfStartedAt
    : match.startedAt;
  const periodStart = periodStartedAt
    ? new Date(periodStartedAt).getTime()
    : Number.NaN;

  if (!Number.isFinite(periodStart)) {
    return null;
  }

  const halfSeconds = Math.max(1, Math.floor((matchMinutes * 60) / 2));
  const elapsedSeconds = Math.max(0, Math.floor((now - periodStart) / 1000));
  const addedTime = elapsedSeconds >= halfSeconds;
  const displaySeconds = addedTime
    ? elapsedSeconds - halfSeconds
    : elapsedSeconds + (isSecondHalf ? halfSeconds : 0);

  return {
    addedTime,
    clockLabel: `${addedTime ? "+" : ""}${formatClock(displaySeconds)}`,
    periodLabel: isSecondHalf ? "Second half" : "First half",
  };
}

import type { FootballMatch } from "@/lib/football-types";

export type FootballClock = {
  addedTimePlayedLabel: string | null;
  addedTimeNeededLabel: string;
  addedTimeNeededSeconds: number;
  clockLabel: string;
  isInAddedTime: boolean;
  isPaused: boolean;
  periodLabel: "First half" | "Second half";
};

export function formatFootballDuration(totalSeconds: number) {
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

  const pausedAt = match.clockPausedAt
    ? new Date(match.clockPausedAt).getTime()
    : Number.NaN;
  const activeStoppageSeconds = Number.isFinite(pausedAt)
    ? Math.max(0, Math.floor((now - pausedAt) / 1000))
    : 0;
  const recordedStoppageSeconds = isSecondHalf
    ? match.secondHalfStoppageSeconds
    : match.firstHalfStoppageSeconds;
  const addedTimeNeededSeconds =
    recordedStoppageSeconds + activeStoppageSeconds;
  const halfSeconds = Math.max(1, Math.floor((matchMinutes * 60) / 2));
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - periodStart) / 1000) - addedTimeNeededSeconds,
  );
  const isInAddedTime = elapsedSeconds >= halfSeconds;
  const addedTimePlayedSeconds = Math.max(0, elapsedSeconds - halfSeconds);
  const displaySeconds = Math.min(elapsedSeconds, halfSeconds) +
    (isSecondHalf ? halfSeconds : 0);

  return {
    addedTimePlayedLabel: isInAddedTime
      ? `+${formatFootballDuration(addedTimePlayedSeconds)}`
      : null,
    addedTimeNeededLabel: `+${formatFootballDuration(addedTimeNeededSeconds)}`,
    addedTimeNeededSeconds,
    clockLabel: formatFootballDuration(displaySeconds),
    isInAddedTime,
    isPaused: Number.isFinite(pausedAt),
    periodLabel: isSecondHalf ? "Second half" : "First half",
  };
}

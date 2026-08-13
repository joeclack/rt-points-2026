import assert from "node:assert/strict";
import test from "node:test";

import { getFootballClock } from "../lib/football-clock.ts";

const kickoff = "2026-08-13T12:00:00.000Z";
const baseMatch = {
  status: "live",
  startedAt: kickoff,
  secondHalfStartedAt: null,
  clockPausedAt: null,
  firstHalfStoppageSeconds: 0,
  secondHalfStoppageSeconds: 0,
};

test("football clock uses the configured first-half length", () => {
  const clock = getFootballClock(
    baseMatch,
    20,
    new Date("2026-08-13T12:07:42.000Z").getTime(),
  );

  assert.deepEqual(clock, {
    addedTimePlayedLabel: null,
    addedTimeNeededLabel: "+0:00",
    addedTimeNeededSeconds: 0,
    clockLabel: "7:42",
    isInAddedTime: false,
    isPaused: false,
    periodLabel: "First half",
  });
});

test("a stoppage freezes the match clock and increases added time needed", () => {
  const clock = getFootballClock(
    {
      ...baseMatch,
      clockPausedAt: "2026-08-13T12:07:42.000Z",
    },
    20,
    new Date("2026-08-13T12:09:56.000Z").getTime(),
  );

  assert.deepEqual(clock, {
    addedTimePlayedLabel: null,
    addedTimeNeededLabel: "+2:14",
    addedTimeNeededSeconds: 134,
    clockLabel: "7:42",
    isInAddedTime: false,
    isPaused: true,
    periodLabel: "First half",
  });
});

test("resumed play excludes recorded stoppages from the match clock", () => {
  const clock = getFootballClock(
    { ...baseMatch, firstHalfStoppageSeconds: 134 },
    20,
    new Date("2026-08-13T12:09:56.000Z").getTime(),
  );

  assert.equal(clock?.clockLabel, "7:42");
  assert.equal(clock?.addedTimeNeededLabel, "+2:14");
  assert.equal(clock?.isPaused, false);
});

test("added time played is shown separately from added time needed", () => {
  const clock = getFootballClock(
    { ...baseMatch, firstHalfStoppageSeconds: 134 },
    20,
    new Date("2026-08-13T12:12:44.000Z").getTime(),
  );

  assert.equal(clock?.clockLabel, "10:00");
  assert.equal(clock?.addedTimePlayedLabel, "+0:30");
  assert.equal(clock?.addedTimeNeededLabel, "+2:14");
  assert.equal(clock?.isInAddedTime, true);
});

test("second-half clock continues from the half-time minute", () => {
  const clock = getFootballClock(
    {
      ...baseMatch,
      secondHalfStartedAt: "2026-08-13T12:15:00.000Z",
    },
    20,
    new Date("2026-08-13T12:18:25.000Z").getTime(),
  );

  assert.deepEqual(clock, {
    addedTimePlayedLabel: null,
    addedTimeNeededLabel: "+0:00",
    addedTimeNeededSeconds: 0,
    clockLabel: "13:25",
    isInAddedTime: false,
    isPaused: false,
    periodLabel: "Second half",
  });
});

test("half-time does not return a running clock", () => {
  assert.equal(
    getFootballClock({ ...baseMatch, status: "halftime" }, 20),
    null,
  );
});

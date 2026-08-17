import assert from "node:assert/strict";
import test from "node:test";

import { getFootballClock } from "../lib/football-clock.ts";

const kickoff = "2026-08-13T12:00:00.000Z";
const baseMatch = {
  status: "live",
  startedAt: kickoff,
  secondHalfStartedAt: null,
  stoppageStartedAt: null,
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
    isTrackingStoppage: false,
    periodLabel: "First half",
  });
});

test("a stoppage leaves the match clock running and increases added time needed", () => {
  const clock = getFootballClock(
    {
      ...baseMatch,
      stoppageStartedAt: "2026-08-13T12:07:42.000Z",
    },
    20,
    new Date("2026-08-13T12:09:56.000Z").getTime(),
  );

  assert.deepEqual(clock, {
    addedTimePlayedLabel: null,
    addedTimeNeededLabel: "+2:14",
    addedTimeNeededSeconds: 134,
    clockLabel: "9:56",
    isInAddedTime: false,
    isTrackingStoppage: true,
    periodLabel: "First half",
  });
});

test("recorded stoppages do not reduce elapsed match time", () => {
  const clock = getFootballClock(
    { ...baseMatch, firstHalfStoppageSeconds: 134 },
    20,
    new Date("2026-08-13T12:09:56.000Z").getTime(),
  );

  assert.equal(clock?.clockLabel, "9:56");
  assert.equal(clock?.addedTimeNeededLabel, "+2:14");
  assert.equal(clock?.isTrackingStoppage, false);
});

test("added time played is shown separately from added time needed", () => {
  const clock = getFootballClock(
    { ...baseMatch, firstHalfStoppageSeconds: 134 },
    20,
    new Date("2026-08-13T12:12:44.000Z").getTime(),
  );

  assert.equal(clock?.clockLabel, "10:00");
  assert.equal(clock?.addedTimePlayedLabel, "+2:44");
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
    isTrackingStoppage: false,
    periodLabel: "Second half",
  });
});

test("half-time does not return a running clock", () => {
  assert.equal(
    getFootballClock({ ...baseMatch, status: "halftime" }, 20),
    null,
  );
});

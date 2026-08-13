import assert from "node:assert/strict";
import test from "node:test";

import { getFootballClock } from "../lib/football-clock.ts";

const kickoff = "2026-08-13T12:00:00.000Z";
const baseMatch = {
  status: "live",
  startedAt: kickoff,
  secondHalfStartedAt: null,
};

test("football clock uses the configured first-half length", () => {
  const clock = getFootballClock(
    baseMatch,
    20,
    new Date("2026-08-13T12:07:42.000Z").getTime(),
  );

  assert.deepEqual(clock, {
    addedTime: false,
    clockLabel: "7:42",
    periodLabel: "First half",
  });
});

test("football clock counts added time after the half expires", () => {
  const clock = getFootballClock(
    baseMatch,
    20,
    new Date("2026-08-13T12:12:14.000Z").getTime(),
  );

  assert.deepEqual(clock, {
    addedTime: true,
    clockLabel: "+2:14",
    periodLabel: "First half",
  });
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
    addedTime: false,
    clockLabel: "13:25",
    periodLabel: "Second half",
  });
});

test("half-time does not return a running clock", () => {
  assert.equal(
    getFootballClock({ ...baseMatch, status: "halftime" }, 20),
    null,
  );
});

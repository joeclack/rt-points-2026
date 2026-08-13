import assert from "node:assert/strict";
import test from "node:test";

import { calculateBasketballStandings } from "../lib/basketball-types.ts";

const teams = [
  { id: "red", name: "Red", colour: "#ef4444", badge: "R" },
  { id: "blue", name: "Blue", colour: "#3b82f6", badge: "B" },
  { id: "green", name: "Green", colour: "#22c55e", badge: "G" },
];

function match(overrides = {}) {
  return {
    id: crypto.randomUUID(), tournamentId: "league", eventId: "event",
    homeTeamId: "red", awayTeamId: "blue", stage: "league",
    roundNumber: 1, position: 1, tipoffAt: null, court: null,
    status: "full_time", homeScore: 12, awayScore: 8,
    winnerTeamId: "red", nextMatchId: null, nextMatchSlot: null,
    startedAt: null, endedAt: null, updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function tournament(matches) {
  return {
    id: "league", eventId: "event", name: "2v2 League", format: "league",
    startStage: null, status: "live", gameMinutes: 8,
    teamIds: teams.map((team) => team.id), matches,
  };
}

test("basketball standings rank wins before point difference", () => {
  const standings = calculateBasketballStandings(tournament([
    match(),
    match({ homeTeamId: "blue", awayTeamId: "green", homeScore: 20, awayScore: 2, winnerTeamId: "blue" }),
  ]), teams);

  assert.deepEqual(standings.map((row) => [row.team.id, row.won, row.difference]), [
    ["blue", 1, 14],
    ["red", 1, 4],
    ["green", 0, -18],
  ]);
});

test("live and scheduled basketball games do not affect final standings", () => {
  const standings = calculateBasketballStandings(tournament([
    match({ status: "live", homeScore: 9, awayScore: 1 }),
    match({ status: "scheduled" }),
  ]), teams);

  assert.ok(standings.every((row) => row.played === 0 && row.won === 0));
});

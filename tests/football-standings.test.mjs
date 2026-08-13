import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFootballStandings,
  getFootballTournamentWinner,
} from "../lib/football-types.ts";

const teams = [
  {
    id: "red",
    name: "Red",
    colour: "#ef4444",
    badge: "R",
    points: 0,
  },
  {
    id: "blue",
    name: "Blue",
    colour: "#3b82f6",
    badge: "B",
    points: 0,
  },
  {
    id: "green",
    name: "Green",
    colour: "#22c55e",
    badge: "G",
    points: 0,
  },
];

function tournamentWith(matches) {
  return {
    id: "league",
    eventId: "event",
    name: "League",
    format: "league",
    startStage: null,
    status: "live",
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    teamIds: teams.map((team) => team.id),
    matches,
  };
}

function match(overrides) {
  return {
    id: crypto.randomUUID(),
    tournamentId: "league",
    eventId: "event",
    homeTeamId: "red",
    awayTeamId: "blue",
    stage: "league",
    roundNumber: 1,
    position: 1,
    kickoffAt: null,
    venue: null,
    status: "full_time",
    homeScore: 0,
    awayScore: 0,
    winnerTeamId: null,
    nextMatchId: null,
    nextMatchSlot: null,
    startedAt: null,
    endedAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("table applies win, draw and goal-difference tie breakers", () => {
  const standings = calculateFootballStandings(
    tournamentWith([
      match({ homeScore: 2, awayScore: 0 }),
      match({
        homeTeamId: "blue",
        awayTeamId: "green",
        homeScore: 1,
        awayScore: 1,
        roundNumber: 2,
      }),
    ]),
    teams,
  );

  assert.deepEqual(
    standings.map((standing) => [
      standing.team.id,
      standing.points,
      standing.goalDifference,
    ]),
    [
      ["red", 3, 2],
      ["green", 1, 0],
      ["blue", 1, -2],
    ],
  );
});

test("live score is reflected in the provisional table", () => {
  const standings = calculateFootballStandings(
    tournamentWith([
      match({ status: "live", homeScore: 1, awayScore: 0 }),
    ]),
    teams,
  );

  assert.equal(standings[0].team.id, "red");
  assert.equal(standings[0].played, 1);
  assert.equal(standings[0].points, 3);
});

test("scheduled and cancelled matches do not affect standings", () => {
  const standings = calculateFootballStandings(
    tournamentWith([
      match({ status: "scheduled", homeScore: 4 }),
      match({ status: "cancelled", awayScore: 3 }),
    ]),
    teams,
  );

  assert.ok(
    standings.every(
      (standing) => standing.played === 0 && standing.points === 0,
    ),
  );
});

test("completed football tournament resolves league and knockout winners", () => {
  const league = tournamentWith([match({ homeScore: 2, awayScore: 0 })]);
  league.status = "completed";

  assert.equal(getFootballTournamentWinner(league, teams)?.id, "red");
  assert.equal(
    getFootballTournamentWinner(
      {
        ...league,
        format: "knockout",
        matches: [
          match({
            stage: "final",
            winnerTeamId: "blue",
          }),
        ],
      },
      teams,
    )?.id,
    "blue",
  );
});


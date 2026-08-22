import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnockoutFixtures,
  createRoundRobinFixtures,
} from "../lib/football-fixtures.ts";

function createTournament(startStage, teamIds) {
  return {
    id: "tournament",
    eventId: "event",
    status: "scheduled",
    matches: createKnockoutFixtures(
      "tournament",
      "event",
      teamIds,
      startStage,
    ).map((fixture) => ({
      id: fixture.id,
      homeTeamId: fixture.home_team_id,
      awayTeamId: fixture.away_team_id,
      stage: fixture.stage,
      roundNumber: fixture.round_number,
      position: fixture.position,
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
      winnerTeamId: null,
      nextMatchId: fixture.next_match_id,
      nextMatchSlot: fixture.next_match_slot,
      controlVersion: 0,
    })),
  };
}

function createLeagueTournament(teamIds) {
  return {
    id: "tournament",
    eventId: "event",
    status: "scheduled",
    matches: createRoundRobinFixtures("tournament", "event", teamIds).map(
      (fixture) => ({
        id: fixture.id,
        homeTeamId: fixture.home_team_id,
        awayTeamId: fixture.away_team_id,
        stage: fixture.stage,
        roundNumber: fixture.round_number,
        position: fixture.position,
        status: "scheduled",
        homeScore: 0,
        awayScore: 0,
        winnerTeamId: null,
        nextMatchId: null,
        nextMatchSlot: null,
        controlVersion: 0,
      }),
    ),
  };
}

function findMatch(tournament, stage, position = 1) {
  return tournament.matches.find(
    (match) => match.stage === stage && match.position === position,
  );
}

function remainingPlayableMatches(tournament) {
  return tournament.matches.filter((match) => match.status !== "full_time");
}

function applyCommand(tournament, match, command, payload = {}) {
  if (command === "start") {
    if (
      match.status !== "scheduled" ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      throw new Error("This game is not ready to start");
    }

    match.status = "live";
    tournament.status = "live";
  } else if (command === "score_delta") {
    if (match.status !== "live") {
      throw new Error("Start the game before scoring");
    }

    if (!["home", "away"].includes(payload.side)) {
      throw new Error("Score change is invalid");
    }

    if (![-1, 1, 2, 3].includes(payload.delta)) {
      throw new Error("Score change is invalid");
    }

    if (payload.side === "home") {
      match.homeScore = Math.max(0, match.homeScore + payload.delta);
    } else {
      match.awayScore = Math.max(0, match.awayScore + payload.delta);
    }
  } else if (command === "finish") {
    if (match.status !== "live") {
      throw new Error("Only a live game can finish");
    }

    if (match.homeScore === match.awayScore) {
      throw new Error("Basketball games need a winner");
    }

    const winner =
      match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
    match.status = "full_time";
    match.winnerTeamId = winner;

    if (match.nextMatchId) {
      const nextMatch = tournament.matches.find(
        (candidate) => candidate.id === match.nextMatchId,
      );

      if (!nextMatch || nextMatch.status !== "scheduled") {
        throw new Error("The next knockout game has already started");
      }

      if (match.nextMatchSlot === "home") {
        if (nextMatch.homeTeamId && nextMatch.homeTeamId !== winner) {
          throw new Error("The next knockout game already has a different home team");
        }
        nextMatch.homeTeamId = winner;
      } else {
        if (nextMatch.awayTeamId && nextMatch.awayTeamId !== winner) {
          throw new Error("The next knockout game already has a different away team");
        }
        nextMatch.awayTeamId = winner;
      }

      nextMatch.controlVersion += 1;
    }

    tournament.status = remainingPlayableMatches(tournament).length
      ? "live"
      : "completed";
  } else if (command === "reopen") {
    if (match.status !== "full_time") {
      throw new Error("Only a finished game can be reopened");
    }

    if (match.nextMatchId) {
      const nextMatch = tournament.matches.find(
        (candidate) => candidate.id === match.nextMatchId,
      );

      if (nextMatch?.status !== "scheduled") {
        throw new Error("The next knockout game has started");
      }

      if (nextMatch && match.winnerTeamId) {
        if (
          match.nextMatchSlot === "home" &&
          nextMatch.homeTeamId === match.winnerTeamId
        ) {
          nextMatch.homeTeamId = null;
          nextMatch.controlVersion += 1;
        } else if (
          match.nextMatchSlot === "away" &&
          nextMatch.awayTeamId === match.winnerTeamId
        ) {
          nextMatch.awayTeamId = null;
          nextMatch.controlVersion += 1;
        }
      }
    }

    match.status = "live";
    match.winnerTeamId = null;
    tournament.status = "live";
  } else {
    throw new Error("Game action is invalid");
  }

  match.controlVersion += 1;
}

function playMatch(tournament, match, homeScore, awayScore) {
  applyCommand(tournament, match, "start");
  addScore(tournament, match, "home", homeScore);
  addScore(tournament, match, "away", awayScore);
  applyCommand(tournament, match, "finish");
}

function addScore(tournament, match, side, points) {
  let remaining = points;

  while (remaining > 0) {
    const delta = Math.min(3, remaining);
    applyCommand(tournament, match, "score_delta", { side, delta });
    remaining -= delta;
  }
}

test("final-only basketball tournament completes with the final winner", () => {
  const tournament = createTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  playMatch(tournament, final, 3, 2);

  assert.equal(tournament.status, "completed");
  assert.equal(final.status, "full_time");
  assert.equal(final.winnerTeamId, "red");
});

test("semi-final winners fill final slots and final completes the tournament", () => {
  const tournament = createTournament("semi_final", [
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 2, 1);
  assert.equal(final.homeTeamId, "red");
  assert.equal(final.awayTeamId, null);
  assert.throws(
    () => applyCommand(tournament, final, "start"),
    /not ready to start/,
  );

  playMatch(tournament, semiTwo, 1, 3);
  assert.equal(final.homeTeamId, "red");
  assert.equal(final.awayTeamId, "green");

  playMatch(tournament, final, 1, 2);
  assert.equal(final.winnerTeamId, "green");
  assert.equal(tournament.status, "completed");
});

test("quarter-final basketball bracket progresses through every round", () => {
  const tournament = createTournament("quarter_final", [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
  ]);

  for (const quarterFinal of tournament.matches.filter(
    (match) => match.stage === "quarter_final",
  )) {
    playMatch(tournament, quarterFinal, 2, 1);
  }

  const semiFinals = tournament.matches.filter(
    (match) => match.stage === "semi_final",
  );
  assert.ok(
    semiFinals.every((match) => match.homeTeamId && match.awayTeamId),
  );

  playMatch(tournament, semiFinals[0], 1, 2);
  playMatch(tournament, semiFinals[1], 3, 1);

  const final = findMatch(tournament, "final");
  assert.ok(final.homeTeamId);
  assert.ok(final.awayTeamId);

  playMatch(tournament, final, 2, 3);

  assert.equal(tournament.status, "completed");
  assert.equal(final.winnerTeamId, final.awayTeamId);
});

test("round-robin basketball tournament completes after every game finishes", () => {
  const tournament = createLeagueTournament(["red", "blue", "green"]);

  assert.equal(tournament.matches.length, 3);

  tournament.matches.forEach((match, index) => {
    playMatch(tournament, match, index + 1, index + 2);
  });

  assert.equal(tournament.status, "completed");
  assert.ok(
    tournament.matches.every((match) => match.status === "full_time"),
  );
});

test("basketball finish rejects tied games", () => {
  const tournament = createTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  applyCommand(tournament, final, "start");
  applyCommand(tournament, final, "score_delta", { side: "home", delta: 2 });
  applyCommand(tournament, final, "score_delta", { side: "away", delta: 2 });

  assert.throws(
    () => applyCommand(tournament, final, "finish"),
    /need a winner/,
  );
  assert.equal(final.status, "live");
  assert.equal(tournament.status, "live");
});

test("basketball score cannot go below zero", () => {
  const tournament = createTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  applyCommand(tournament, final, "start");
  applyCommand(tournament, final, "score_delta", { side: "home", delta: -1 });

  assert.equal(final.homeScore, 0);
});

test("reopening a completed qualifier clears and can replace the next slot", () => {
  const tournament = createTournament("semi_final", [
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const semiOne = findMatch(tournament, "semi_final", 1);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 2, 1);
  assert.equal(final.homeTeamId, "red");

  applyCommand(tournament, semiOne, "reopen");
  assert.equal(final.homeTeamId, null);

  applyCommand(tournament, semiOne, "score_delta", { side: "away", delta: 2 });
  applyCommand(tournament, semiOne, "finish");

  assert.equal(semiOne.winnerTeamId, "yellow");
  assert.equal(final.homeTeamId, "yellow");
});

test("reopening a qualifier is blocked once the next game has started", () => {
  const tournament = createTournament("semi_final", [
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 2, 1);
  playMatch(tournament, semiTwo, 2, 1);
  applyCommand(tournament, final, "start");

  assert.throws(
    () => applyCommand(tournament, semiOne, "reopen"),
    /next knockout game has started/,
  );
});

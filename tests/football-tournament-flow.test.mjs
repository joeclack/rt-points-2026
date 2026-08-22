import assert from "node:assert/strict";
import test from "node:test";

import {
  createGroupKnockoutFixtures,
  createKnockoutFixtures,
  createRoundRobinFixtures,
} from "../lib/football-fixtures.ts";

function mapFixture(fixture) {
  return {
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
    secondHalfStartedAt: null,
    stoppageStartedAt: null,
    firstHalfStoppageSeconds: 0,
    secondHalfStoppageSeconds: 0,
    controlVersion: 0,
  };
}

function createKnockoutTournament(startStage, teamIds) {
  return {
    id: "tournament",
    eventId: "event",
    format: "knockout",
    status: "scheduled",
    teamIds,
    matches: createKnockoutFixtures(
      "tournament",
      "event",
      teamIds,
      startStage,
    ).map(mapFixture),
  };
}

function createLeagueTournament(teamIds) {
  return {
    id: "tournament",
    eventId: "event",
    format: "league",
    status: "scheduled",
    teamIds,
    matches: createRoundRobinFixtures("tournament", "event", teamIds).map(
      mapFixture,
    ),
  };
}

function createGroupKnockoutTournament(teamIds) {
  return {
    id: "tournament",
    eventId: "event",
    format: "group_knockout",
    status: "scheduled",
    teamIds,
    matches: createGroupKnockoutFixtures("tournament", "event", teamIds).map(
      mapFixture,
    ),
  };
}

function findMatch(tournament, stage, position = 1) {
  return tournament.matches.find(
    (match) => match.stage === stage && match.position === position,
  );
}

function remainingPlayableMatches(tournament) {
  return tournament.matches.filter(
    (match) => !["full_time", "cancelled"].includes(match.status),
  );
}

function assertCanFinish(tournament, match) {
  const isKnockoutStage = ["quarter_final", "semi_final", "final"].includes(
    match.stage,
  );

  if (
    isKnockoutStage &&
    ["knockout", "group_knockout"].includes(tournament.format) &&
    match.homeScore === match.awayScore
  ) {
    throw new Error("Knockout matches need a winner before full-time");
  }
}

function applyCommand(tournament, match, command, payload = {}) {
  if (command === "start") {
    if (
      match.status !== "scheduled" ||
      !match.homeTeamId ||
      !match.awayTeamId
    ) {
      throw new Error("This match is not ready to start");
    }

    match.status = "live";
    match.secondHalfStartedAt = null;
    match.stoppageStartedAt = null;
    match.firstHalfStoppageSeconds = 0;
    match.secondHalfStoppageSeconds = 0;
    tournament.status = "live";
  } else if (command === "halftime") {
    if (match.status !== "live" || match.secondHalfStartedAt) {
      throw new Error("Only the first half can reach half-time");
    }

    match.status = "halftime";
    match.stoppageStartedAt = null;
  } else if (command === "start_second_half") {
    if (match.status !== "halftime") {
      throw new Error("Only a half-time match can resume");
    }

    match.status = "live";
    match.secondHalfStartedAt = "now";
    match.stoppageStartedAt = null;
  } else if (command === "score_delta") {
    if (!["live", "halftime"].includes(match.status)) {
      throw new Error("Start or reopen the match to change its score");
    }

    if (
      !["home", "away"].includes(payload.side) ||
      ![-1, 1].includes(payload.delta)
    ) {
      throw new Error("Score change is invalid");
    }

    if (payload.side === "home") {
      match.homeScore = Math.max(0, match.homeScore + payload.delta);
    } else {
      match.awayScore = Math.max(0, match.awayScore + payload.delta);
    }
  } else if (command === "set_score") {
    if (!["live", "halftime"].includes(match.status)) {
      throw new Error("Start or reopen the match to correct its score");
    }

    if (
      !Number.isInteger(payload.homeScore) ||
      !Number.isInteger(payload.awayScore) ||
      payload.homeScore < 0 ||
      payload.awayScore < 0
    ) {
      throw new Error("Scores must be whole numbers of zero or more");
    }

    match.homeScore = payload.homeScore;
    match.awayScore = payload.awayScore;
  } else if (command === "finish") {
    if (!["live", "halftime"].includes(match.status)) {
      throw new Error("Only a started match can finish");
    }

    assertCanFinish(tournament, match);

    match.status = "full_time";
    match.stoppageStartedAt = null;
    match.winnerTeamId =
      match.homeScore === match.awayScore
        ? null
        : match.homeScore > match.awayScore
          ? match.homeTeamId
          : match.awayTeamId;

    if (match.winnerTeamId && match.nextMatchId) {
      const nextMatch = tournament.matches.find(
        (candidate) => candidate.id === match.nextMatchId,
      );

      if (nextMatch?.status === "scheduled") {
        if (match.nextMatchSlot === "home") {
          nextMatch.homeTeamId = match.winnerTeamId;
        } else {
          nextMatch.awayTeamId = match.winnerTeamId;
        }
      }
    }

    if (tournament.format === "group_knockout" && match.stage === "league") {
      seedGroupKnockoutSemis(tournament);
    }

    tournament.status = remainingPlayableMatches(tournament).length
      ? "live"
      : "completed";
  } else if (command === "reopen") {
    if (match.status !== "full_time") {
      throw new Error("Only a completed match can be reopened");
    }

    if (match.nextMatchId) {
      const nextMatch = tournament.matches.find(
        (candidate) => candidate.id === match.nextMatchId,
      );

      if (nextMatch?.status !== "scheduled") {
        throw new Error("The next knockout match has started");
      }

      if (nextMatch && match.winnerTeamId) {
        if (
          match.nextMatchSlot === "home" &&
          nextMatch.homeTeamId === match.winnerTeamId
        ) {
          nextMatch.homeTeamId = null;
        } else if (
          match.nextMatchSlot === "away" &&
          nextMatch.awayTeamId === match.winnerTeamId
        ) {
          nextMatch.awayTeamId = null;
        }
      }
    }

    match.status = "live";
    match.winnerTeamId = null;
    match.secondHalfStartedAt = "now";
    match.stoppageStartedAt = null;
    tournament.status = "live";
  } else {
    throw new Error("Match action is invalid");
  }

  match.controlVersion += 1;
}

function addGoals(tournament, match, side, goals) {
  for (let index = 0; index < goals; index += 1) {
    applyCommand(tournament, match, "score_delta", { side, delta: 1 });
  }
}

function playMatch(tournament, match, homeScore, awayScore) {
  applyCommand(tournament, match, "start");
  addGoals(tournament, match, "home", homeScore);
  addGoals(tournament, match, "away", awayScore);
  applyCommand(tournament, match, "finish");
}

function groupCodeForSeed(seed, groupASize) {
  return seed <= groupASize ? "A" : "B";
}

function calculateGroupRows(tournament) {
  const groupASize = Math.ceil(tournament.teamIds.length / 2);
  const seedByTeam = new Map(
    tournament.teamIds.map((teamId, index) => [teamId, index + 1]),
  );
  const rows = new Map(
    tournament.teamIds.map((teamId, index) => [
      teamId,
      {
        teamId,
        seed: index + 1,
        groupCode: groupCodeForSeed(index + 1, groupASize),
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
      },
    ]),
  );

  for (const match of tournament.matches.filter(
    (candidate) => candidate.stage === "league" && candidate.status === "full_time",
  )) {
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);

    if (
      !home ||
      !away ||
      groupCodeForSeed(seedByTeam.get(match.homeTeamId), groupASize) !==
        groupCodeForSeed(seedByTeam.get(match.awayTeamId), groupASize)
    ) {
      continue;
    }

    home.goalsFor += match.homeScore;
    away.goalsFor += match.awayScore;
    home.goalDifference += match.homeScore - match.awayScore;
    away.goalDifference += match.awayScore - match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.points += 3;
    } else if (match.awayScore > match.homeScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      a.groupCode.localeCompare(b.groupCode) ||
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.seed - b.seed,
  );
}

function seedGroupKnockoutSemis(tournament) {
  const groupMatches = tournament.matches.filter(
    (match) => match.stage === "league",
  );

  if (groupMatches.some((match) => match.status !== "full_time")) {
    return;
  }

  const ranked = calculateGroupRows(tournament);
  const groupA = ranked.filter((row) => row.groupCode === "A");
  const groupB = ranked.filter((row) => row.groupCode === "B");
  const [aWinner, aRunnerUp] = groupA;
  const [bWinner, bRunnerUp] = groupB;

  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);
  semiOne.homeTeamId = aWinner?.teamId ?? null;
  semiOne.awayTeamId = bRunnerUp?.teamId ?? null;
  semiTwo.homeTeamId = bWinner?.teamId ?? null;
  semiTwo.awayTeamId = aRunnerUp?.teamId ?? null;
}

test("final-only football knockout completes with the final winner", () => {
  const tournament = createKnockoutTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  playMatch(tournament, final, 1, 0);

  assert.equal(tournament.status, "completed");
  assert.equal(final.status, "full_time");
  assert.equal(final.winnerTeamId, "red");
});

test("football knockout rejects tied full-time results", () => {
  const tournament = createKnockoutTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  applyCommand(tournament, final, "start");

  assert.throws(
    () => applyCommand(tournament, final, "finish"),
    /need a winner/,
  );
  assert.equal(final.status, "live");
  assert.equal(tournament.status, "live");
});

test("semi-final winners fill final slots and final completes football knockout", () => {
  const tournament = createKnockoutTournament("semi_final", [
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 2, 0);
  assert.equal(final.homeTeamId, "red");
  assert.equal(final.awayTeamId, null);
  assert.throws(
    () => applyCommand(tournament, final, "start"),
    /not ready to start/,
  );

  playMatch(tournament, semiTwo, 0, 1);
  assert.equal(final.homeTeamId, "red");
  assert.equal(final.awayTeamId, "green");

  playMatch(tournament, final, 3, 2);
  assert.equal(final.winnerTeamId, "red");
  assert.equal(tournament.status, "completed");
});

test("quarter-final football bracket progresses through every round", () => {
  const tournament = createKnockoutTournament("quarter_final", [
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
    playMatch(tournament, quarterFinal, 1, 0);
  }

  const semiFinals = tournament.matches.filter(
    (match) => match.stage === "semi_final",
  );
  assert.ok(
    semiFinals.every((match) => match.homeTeamId && match.awayTeamId),
  );

  playMatch(tournament, semiFinals[0], 0, 2);
  playMatch(tournament, semiFinals[1], 1, 0);

  const final = findMatch(tournament, "final");
  assert.ok(final.homeTeamId);
  assert.ok(final.awayTeamId);

  playMatch(tournament, final, 0, 1);

  assert.equal(tournament.status, "completed");
  assert.equal(final.winnerTeamId, final.awayTeamId);
});

test("football league completes after every match and allows draws", () => {
  const tournament = createLeagueTournament(["red", "blue", "green"]);

  assert.equal(tournament.matches.length, 3);

  playMatch(tournament, tournament.matches[0], 1, 1);
  playMatch(tournament, tournament.matches[1], 2, 0);
  playMatch(tournament, tournament.matches[2], 0, 3);

  assert.equal(tournament.status, "completed");
  assert.equal(tournament.matches[0].winnerTeamId, null);
  assert.ok(
    tournament.matches.every((match) => match.status === "full_time"),
  );
});

test("football match can move through half-time and finish from live play", () => {
  const tournament = createKnockoutTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  applyCommand(tournament, final, "start");
  addGoals(tournament, final, "home", 1);
  applyCommand(tournament, final, "halftime");
  applyCommand(tournament, final, "score_delta", { side: "away", delta: 1 });
  applyCommand(tournament, final, "start_second_half");
  applyCommand(tournament, final, "score_delta", { side: "home", delta: 1 });
  applyCommand(tournament, final, "finish");

  assert.equal(final.status, "full_time");
  assert.equal(final.winnerTeamId, "red");
  assert.equal(tournament.status, "completed");
});

test("football score correction and score floor match referee controls", () => {
  const tournament = createKnockoutTournament("final", ["red", "blue"]);
  const final = findMatch(tournament, "final");

  applyCommand(tournament, final, "start");
  applyCommand(tournament, final, "score_delta", { side: "home", delta: -1 });
  assert.equal(final.homeScore, 0);

  applyCommand(tournament, final, "set_score", {
    homeScore: 4,
    awayScore: 2,
  });
  applyCommand(tournament, final, "finish");

  assert.equal(final.homeScore, 4);
  assert.equal(final.awayScore, 2);
  assert.equal(final.winnerTeamId, "red");
});

test("reopening a football qualifier clears and can replace the next slot", () => {
  const tournament = createKnockoutTournament("semi_final", [
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const semiOne = findMatch(tournament, "semi_final", 1);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 1, 0);
  assert.equal(final.homeTeamId, "red");

  applyCommand(tournament, semiOne, "reopen");
  assert.equal(final.homeTeamId, null);

  applyCommand(tournament, semiOne, "score_delta", { side: "away", delta: 1 });
  applyCommand(tournament, semiOne, "score_delta", { side: "away", delta: 1 });
  applyCommand(tournament, semiOne, "finish");

  assert.equal(semiOne.winnerTeamId, "yellow");
  assert.equal(final.homeTeamId, "yellow");
});

test("reopening a football qualifier is blocked once the next match has started", () => {
  const tournament = createKnockoutTournament("semi_final", [
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 1, 0);
  playMatch(tournament, semiTwo, 1, 0);
  applyCommand(tournament, final, "start");

  assert.throws(
    () => applyCommand(tournament, semiOne, "reopen"),
    /next knockout match has started/,
  );
});

test("groups plus knockout seeds semis after the last group match", () => {
  const tournament = createGroupKnockoutTournament([
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const groupMatches = tournament.matches.filter(
    (match) => match.stage === "league",
  );
  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);

  assert.equal(groupMatches.length, 2);
  assert.equal(semiOne.homeTeamId, null);
  assert.equal(semiOne.awayTeamId, null);

  playMatch(tournament, groupMatches[0], 2, 0);
  assert.equal(semiOne.homeTeamId, null);

  playMatch(tournament, groupMatches[1], 0, 1);

  assert.deepEqual(
    [
      semiOne.homeTeamId,
      semiOne.awayTeamId,
      semiTwo.homeTeamId,
      semiTwo.awayTeamId,
    ],
    ["red", "green", "yellow", "blue"],
  );
});

test("groups plus knockout then progresses semis into final", () => {
  const tournament = createGroupKnockoutTournament([
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const groupMatches = tournament.matches.filter(
    (match) => match.stage === "league",
  );

  playMatch(tournament, groupMatches[0], 2, 0);
  playMatch(tournament, groupMatches[1], 0, 1);

  const semiOne = findMatch(tournament, "semi_final", 1);
  const semiTwo = findMatch(tournament, "semi_final", 2);
  const final = findMatch(tournament, "final");

  playMatch(tournament, semiOne, 1, 0);
  playMatch(tournament, semiTwo, 0, 1);

  assert.equal(final.homeTeamId, "red");
  assert.equal(final.awayTeamId, "blue");

  playMatch(tournament, final, 2, 1);

  assert.equal(final.winnerTeamId, "red");
  assert.equal(tournament.status, "completed");
});

test("groups plus knockout rejects drawn semis and finals", () => {
  const tournament = createGroupKnockoutTournament([
    "red",
    "blue",
    "green",
    "yellow",
  ]);
  const groupMatches = tournament.matches.filter(
    (match) => match.stage === "league",
  );

  playMatch(tournament, groupMatches[0], 2, 0);
  playMatch(tournament, groupMatches[1], 0, 1);

  const semiOne = findMatch(tournament, "semi_final", 1);
  applyCommand(tournament, semiOne, "start");
  applyCommand(tournament, semiOne, "score_delta", { side: "home", delta: 1 });
  applyCommand(tournament, semiOne, "score_delta", { side: "away", delta: 1 });

  assert.throws(
    () => applyCommand(tournament, semiOne, "finish"),
    /need a winner/,
  );
  assert.equal(semiOne.status, "live");
});

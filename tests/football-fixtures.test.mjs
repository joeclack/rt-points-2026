import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnockoutFixtures,
  createRoundRobinFixtures,
  createSevenTeamGroupKnockoutFixtures,
} from "../lib/football-fixtures.ts";

function pairingKey(match) {
  return [match.home_team_id, match.away_team_id].sort().join(":");
}

test("round robin creates every pairing once for an even team count", () => {
  const teams = ["a", "b", "c", "d"];
  const fixtures = createRoundRobinFixtures("tournament", "event", teams);

  assert.equal(fixtures.length, 6);
  assert.equal(new Set(fixtures.map(pairingKey)).size, 6);
  assert.deepEqual(
    [...new Set(fixtures.map((fixture) => fixture.round_number))],
    [1, 2, 3],
  );

  teams.forEach((teamId) => {
    assert.equal(
      fixtures.filter(
        (fixture) =>
          fixture.home_team_id === teamId ||
          fixture.away_team_id === teamId,
      ).length,
      3,
    );
  });
});

test("round robin handles a bye without creating a placeholder match", () => {
  const teams = ["a", "b", "c", "d", "e"];
  const fixtures = createRoundRobinFixtures("tournament", "event", teams);

  assert.equal(fixtures.length, 10);
  assert.equal(new Set(fixtures.map(pairingKey)).size, 10);
  assert.ok(
    fixtures.every(
      (fixture) => fixture.home_team_id && fixture.away_team_id,
    ),
  );
});

test("quarter-final bracket creates seven linked matches", () => {
  const teams = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const fixtures = createKnockoutFixtures(
    "tournament",
    "event",
    teams,
    "quarter_final",
  );
  const quarterFinals = fixtures.filter(
    (fixture) => fixture.stage === "quarter_final",
  );
  const semiFinals = fixtures.filter(
    (fixture) => fixture.stage === "semi_final",
  );
  const finals = fixtures.filter((fixture) => fixture.stage === "final");

  assert.equal(fixtures.length, 7);
  assert.equal(quarterFinals.length, 4);
  assert.equal(semiFinals.length, 2);
  assert.equal(finals.length, 1);
  assert.deepEqual(
    new Set(
      quarterFinals.flatMap((fixture) => [
        fixture.home_team_id,
        fixture.away_team_id,
      ]),
    ),
    new Set(teams),
  );
  assert.ok(
    quarterFinals.every((fixture) =>
      semiFinals.some(
        (semiFinal) => semiFinal.id === fixture.next_match_id,
      ),
    ),
  );
  assert.ok(
    semiFinals.every(
      (fixture) => fixture.next_match_id === finals[0].id,
    ),
  );
  assert.equal(finals[0].next_match_id, null);
});

test("final-only bracket creates one seeded match", () => {
  const fixtures = createKnockoutFixtures(
    "tournament",
    "event",
    ["home", "away"],
    "final",
  );

  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].stage, "final");
  assert.equal(fixtures[0].home_team_id, "home");
  assert.equal(fixtures[0].away_team_id, "away");
  assert.equal(fixtures[0].next_match_id, null);
});

test("seven-team group knockout creates group games, semis and a final", () => {
  const fixtures = createSevenTeamGroupKnockoutFixtures(
    "tournament",
    "event",
    ["1", "2", "3", "4", "5", "6", "7"],
  );
  const groupMatches = fixtures.filter((fixture) => fixture.stage === "league");
  const semiFinals = fixtures.filter(
    (fixture) => fixture.stage === "semi_final",
  );
  const finals = fixtures.filter((fixture) => fixture.stage === "final");

  assert.equal(fixtures.length, 12);
  assert.equal(groupMatches.length, 9);
  assert.equal(semiFinals.length, 2);
  assert.equal(finals.length, 1);
  assert.ok(
    semiFinals.every(
      (fixture) => !fixture.home_team_id && !fixture.away_team_id,
    ),
  );
  assert.ok(
    semiFinals.every(
      (fixture) => fixture.next_match_id === finals[0].id,
    ),
  );
  assert.equal(finals[0].round_number, 5);
});


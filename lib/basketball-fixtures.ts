import { randomUUID } from "node:crypto";

import type { BasketballStage } from "@/lib/basketball-types";

export type BasketballFixtureInsert = {
  id: string;
  tournament_id: string;
  event_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  stage: BasketballStage;
  round_number: number;
  position: number;
  next_match_id: string | null;
  next_match_slot: "home" | "away" | null;
};

type BracketEntry = {
  fixture?: BasketballFixtureInsert;
  teamId: string | null;
};

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(value));
}

function stageForMatchCount(matchCount: number): BasketballStage {
  if (matchCount === 1) return "final";
  if (matchCount === 2) return "semi_final";
  if (matchCount === 4) return "quarter_final";
  return "friendly";
}

function setNextMatch(
  entry: BracketEntry,
  nextMatchId: string,
  nextMatchSlot: "home" | "away",
) {
  if (entry.fixture) {
    entry.fixture.next_match_id = nextMatchId;
    entry.fixture.next_match_slot = nextMatchSlot;
  }
}

export function createBasketballKnockoutFixtures(
  tournamentId: string,
  eventId: string,
  teamIds: string[],
): BasketballFixtureInsert[] {
  const bracketSize = nextPowerOfTwo(teamIds.length);
  let entries: BracketEntry[] = [
    ...teamIds.map((teamId) => ({ teamId })),
    ...Array.from({ length: bracketSize - teamIds.length }, () => ({
      teamId: null,
    })),
  ];
  const fixtures: BasketballFixtureInsert[] = [];
  let roundNumber = 1;

  while (entries.length > 1) {
    const matchCount = entries.length / 2;
    const nextEntries: BracketEntry[] = [];

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const homeEntry = entries[matchIndex];
      const awayEntry = entries[entries.length - 1 - matchIndex];

      if (!homeEntry.fixture && homeEntry.teamId && !awayEntry.fixture && !awayEntry.teamId) {
        nextEntries[matchIndex] = homeEntry;
        continue;
      }

      if (!awayEntry.fixture && awayEntry.teamId && !homeEntry.fixture && !homeEntry.teamId) {
        nextEntries[matchIndex] = awayEntry;
        continue;
      }

      if (!homeEntry.fixture && !homeEntry.teamId && !awayEntry.fixture && !awayEntry.teamId) {
        nextEntries[matchIndex] = { teamId: null };
        continue;
      }

      const fixture: BasketballFixtureInsert = {
        id: randomUUID(),
        tournament_id: tournamentId,
        event_id: eventId,
        home_team_id: homeEntry.fixture ? null : homeEntry.teamId,
        away_team_id: awayEntry.fixture ? null : awayEntry.teamId,
        stage: stageForMatchCount(matchCount),
        round_number: roundNumber,
        position: matchIndex + 1,
        next_match_id: null,
        next_match_slot: null,
      };

      setNextMatch(homeEntry, fixture.id, "home");
      setNextMatch(awayEntry, fixture.id, "away");
      fixtures.push(fixture);
      nextEntries[matchIndex] = { fixture, teamId: null };
    }

    entries = nextEntries;
    roundNumber += 1;
  }

  return fixtures;
}

export function getBasketballKnockoutStartStage(
  teamCount: number,
): "quarter_final" | "semi_final" | "final" {
  if (teamCount <= 2) return "final";
  if (teamCount <= 4) return "semi_final";
  return "quarter_final";
}

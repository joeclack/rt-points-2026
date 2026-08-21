import { randomUUID } from "node:crypto";

import type {
  FootballKnockoutStage,
  FootballMatchStage,
} from "@/lib/football-types";

export type FootballFixtureInsert = {
  id: string;
  tournament_id: string;
  event_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  stage: FootballMatchStage;
  round_number: number;
  position: number;
  next_match_id: string | null;
  next_match_slot: "home" | "away" | null;
};

export function createRoundRobinFixtures(
  tournamentId: string,
  eventId: string,
  teamIds: string[],
): FootballFixtureInsert[] {
  const rotation: Array<string | null> = [...teamIds];

  if (rotation.length % 2 === 1) {
    rotation.push(null);
  }

  const fixtures: FootballFixtureInsert[] = [];
  const teamCount = rotation.length;

  for (let roundIndex = 0; roundIndex < teamCount - 1; roundIndex += 1) {
    let position = 1;

    for (let pairIndex = 0; pairIndex < teamCount / 2; pairIndex += 1) {
      const first = rotation[pairIndex];
      const second = rotation[teamCount - 1 - pairIndex];

      if (first && second) {
        const reverseHome = (roundIndex + pairIndex) % 2 === 1;
        fixtures.push({
          id: randomUUID(),
          tournament_id: tournamentId,
          event_id: eventId,
          home_team_id: reverseHome ? second : first,
          away_team_id: reverseHome ? first : second,
          stage: "league",
          round_number: roundIndex + 1,
          position,
          next_match_id: null,
          next_match_slot: null,
        });
        position += 1;
      }
    }

    rotation.splice(1, 0, rotation.pop() ?? null);
  }

  return fixtures;
}

export function createKnockoutFixtures(
  tournamentId: string,
  eventId: string,
  teamIds: string[],
  startStage: FootballKnockoutStage,
): FootballFixtureInsert[] {
  const stageOrder: FootballKnockoutStage[] =
    startStage === "quarter_final"
      ? ["quarter_final", "semi_final", "final"]
      : startStage === "semi_final"
        ? ["semi_final", "final"]
        : ["final"];
  const roundIds = stageOrder.map((stage, roundIndex) => {
    const matchCount = 2 ** (stageOrder.length - roundIndex - 1);
    return {
      stage,
      ids: Array.from({ length: matchCount }, () => randomUUID()),
    };
  });
  const fixtures: FootballFixtureInsert[] = [];

  roundIds.forEach((round, roundIndex) => {
    round.ids.forEach((matchId, matchIndex) => {
      const isOpeningRound = roundIndex === 0;
      const nextRound = roundIds[roundIndex + 1];
      const nextMatchId = nextRound
        ? nextRound.ids[Math.floor(matchIndex / 2)]
        : null;
      const nextMatchSlot = nextRound
        ? matchIndex % 2 === 0
          ? "home"
          : "away"
        : null;

      fixtures.push({
        id: matchId,
        tournament_id: tournamentId,
        event_id: eventId,
        home_team_id: isOpeningRound ? teamIds[matchIndex] : null,
        away_team_id: isOpeningRound
          ? teamIds[teamIds.length - 1 - matchIndex]
          : null,
        stage: round.stage,
        round_number: roundIndex + 1,
        position: matchIndex + 1,
        next_match_id: nextMatchId,
        next_match_slot: nextMatchSlot,
      });
    });
  });

  return fixtures;
}

export function createSevenTeamGroupKnockoutFixtures(
  tournamentId: string,
  eventId: string,
  teamIds: string[],
): FootballFixtureInsert[] {
  const [groupA, groupB] = [teamIds.slice(0, 4), teamIds.slice(4, 7)];
  const fixtures: FootballFixtureInsert[] = [];
  const groupAFixtures = createRoundRobinFixtures(
    tournamentId,
    eventId,
    groupA,
  );
  const groupBFixtures = createRoundRobinFixtures(
    tournamentId,
    eventId,
    groupB,
  );
  const groupRoundCount = Math.max(
    ...groupAFixtures.map((fixture) => fixture.round_number),
    ...groupBFixtures.map((fixture) => fixture.round_number),
  );
  const finalId = randomUUID();
  const semiFinalIds = [randomUUID(), randomUUID()];

  fixtures.push(
    ...groupAFixtures.map((fixture) => ({
      ...fixture,
      position: fixture.position,
    })),
    ...groupBFixtures.map((fixture) => ({
      ...fixture,
      position: groupAFixtures.length + fixture.position,
    })),
  );

  semiFinalIds.forEach((matchId, matchIndex) => {
    fixtures.push({
      id: matchId,
      tournament_id: tournamentId,
      event_id: eventId,
      home_team_id: null,
      away_team_id: null,
      stage: "semi_final",
      round_number: groupRoundCount + 1,
      position: matchIndex + 1,
      next_match_id: finalId,
      next_match_slot: matchIndex === 0 ? "home" : "away",
    });
  });

  fixtures.push({
    id: finalId,
    tournament_id: tournamentId,
    event_id: eventId,
    home_team_id: null,
    away_team_id: null,
    stage: "final",
    round_number: groupRoundCount + 2,
    position: 1,
    next_match_id: null,
    next_match_slot: null,
  });

  return fixtures;
}


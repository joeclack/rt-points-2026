import type { Team } from "@/lib/sample-data";

export type BasketballFormat = "league" | "knockout";
export type BasketballStage =
  | "league"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final"
  | "friendly";
export type BasketballStatus =
  | "scheduled"
  | "live"
  | "full_time"
  | "postponed"
  | "cancelled";

export type BasketballMatch = {
  id: string;
  tournamentId: string;
  eventId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  stage: BasketballStage;
  roundNumber: number;
  position: number;
  tipoffAt: string | null;
  court: string | null;
  status: BasketballStatus;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: "home" | "away" | null;
  startedAt: string | null;
  endedAt: string | null;
  controlVersion: number;
  updatedAt: string;
};

export type BasketballTournament = {
  id: string;
  eventId: string;
  name: string;
  format: BasketballFormat;
  startStage: "quarter_final" | "semi_final" | "final" | null;
  status: "scheduled" | "live" | "completed";
  gameMinutes: number;
  teamIds: string[];
  matches: BasketballMatch[];
};

export const basketballStageLabels: Record<BasketballStage, string> = {
  league: "League",
  quarter_final: "Quarter-final",
  semi_final: "Semi-final",
  third_place: "Third place",
  final: "Final",
  friendly: "Extra game",
};

export function calculateBasketballStandings(
  tournament: BasketballTournament,
  teams: Team[],
) {
  const rows = new Map(
    teams
      .filter((team) => tournament.teamIds.includes(team.id))
      .map((team) => [
        team.id,
        {
          team,
          played: 0,
          won: 0,
          lost: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          difference: 0,
        },
      ]),
  );

  tournament.matches
    .filter(
      (match) =>
        match.stage === "league" &&
        match.status === "full_time" &&
        match.homeTeamId &&
        match.awayTeamId,
    )
    .forEach((match) => {
      const home = rows.get(match.homeTeamId!);
      const away = rows.get(match.awayTeamId!);
      if (!home || !away) return;

      home.played += 1;
      away.played += 1;
      home.pointsFor += match.homeScore;
      home.pointsAgainst += match.awayScore;
      away.pointsFor += match.awayScore;
      away.pointsAgainst += match.homeScore;
      if (match.homeScore > match.awayScore) {
        home.won += 1;
        away.lost += 1;
      } else {
        away.won += 1;
        home.lost += 1;
      }
    });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      difference: row.pointsFor - row.pointsAgainst,
    }))
    .sort(
      (a, b) =>
        b.won - a.won ||
        b.difference - a.difference ||
        b.pointsFor - a.pointsFor ||
        a.team.name.localeCompare(b.team.name),
    );
}

export function getBasketballTournamentWinner(
  tournament: BasketballTournament,
  teams: Team[],
) {
  if (tournament.status !== "completed") {
    return null;
  }

  if (tournament.format === "league") {
    return calculateBasketballStandings(tournament, teams)[0]?.team ?? null;
  }

  const final = tournament.matches.find(
    (match) => match.stage === "final" && match.status === "full_time",
  );

  return teams.find((team) => team.id === final?.winnerTeamId) ?? null;
}

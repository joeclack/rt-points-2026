import type { Team } from "@/lib/sample-data";

export type FootballTournamentFormat = "league" | "knockout" | "group_knockout";
export type FootballTournamentStatus = "scheduled" | "live" | "completed";
export type FootballKnockoutStage =
  | "quarter_final"
  | "semi_final"
  | "final";
export type FootballMatchStage =
  | "league"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final"
  | "friendly";
export type FootballMatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "full_time"
  | "postponed"
  | "cancelled";

export type FootballMatch = {
  id: string;
  tournamentId: string;
  eventId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  stage: FootballMatchStage;
  roundNumber: number;
  position: number;
  kickoffAt: string | null;
  venue: string | null;
  status: FootballMatchStatus;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: "home" | "away" | null;
  startedAt: string | null;
  secondHalfStartedAt: string | null;
  stoppageStartedAt: string | null;
  firstHalfStoppageSeconds: number;
  secondHalfStoppageSeconds: number;
  controlVersion: number;
  controllerDeviceId: string | null;
  controllerClaimedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
};

export type FootballTournament = {
  id: string;
  eventId: string;
  name: string;
  format: FootballTournamentFormat;
  startStage: FootballKnockoutStage | null;
  status: FootballTournamentStatus;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  teamIds: string[];
  matches: FootballMatch[];
};

export type FootballStanding = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export const footballStageLabels: Record<FootballMatchStage, string> = {
  league: "League",
  round_of_16: "Round of 16",
  quarter_final: "Quarter-final",
  semi_final: "Semi-final",
  third_place: "Third place",
  final: "Final",
  friendly: "Extra match",
};

export const footballStatusLabels: Record<FootballMatchStatus, string> = {
  scheduled: "Upcoming",
  live: "Live",
  halftime: "Half-time",
  full_time: "Full-time",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export function isLiveFootballMatch(status: FootballMatchStatus) {
  return status === "live" || status === "halftime";
}

export function calculateFootballStandings(
  tournament: FootballTournament,
  teams: Team[],
) {
  const tournamentTeams = teams.filter((team) =>
    tournament.teamIds.includes(team.id),
  );
  const rows = new Map<string, FootballStanding>(
    tournamentTeams.map((team) => [
      team.id,
      {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    ]),
  );

  tournament.matches
    .filter(
      (match) =>
        match.stage === "league" &&
        !["scheduled", "postponed", "cancelled"].includes(match.status) &&
        match.homeTeamId &&
        match.awayTeamId,
    )
    .forEach((match) => {
      const home = rows.get(match.homeTeamId!);
      const away = rows.get(match.awayTeamId!);

      if (!home || !away) {
        return;
      }

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;
      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.won += 1;
        away.lost += 1;
        home.points += tournament.winPoints;
        away.points += tournament.lossPoints;
      } else if (match.awayScore > match.homeScore) {
        away.won += 1;
        home.lost += 1;
        away.points += tournament.winPoints;
        home.points += tournament.lossPoints;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += tournament.drawPoints;
        away.points += tournament.drawPoints;
      }
    });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.team.name.localeCompare(b.team.name),
    );
}

export function getFootballTournamentWinner(
  tournament: FootballTournament,
  teams: Team[],
) {
  if (tournament.status !== "completed") {
    return null;
  }

  if (tournament.format === "league") {
    return calculateFootballStandings(tournament, teams)[0]?.team ?? null;
  }

  const final = tournament.matches.find(
    (match) => match.stage === "final" && match.status === "full_time",
  );

  return teams.find((team) => team.id === final?.winnerTeamId) ?? null;
}


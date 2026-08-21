"use client";

import { Brackets, Check, Clock3, ListOrdered, Trophy } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { createFootballTournament } from "@/app/admin/events/[eventId]/football/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { TeamBadge } from "@/components/team-badge";
import { Input } from "@/components/ui/input";
import {
  footballStageLabels,
  type FootballKnockoutStage,
  type FootballTournamentFormat,
} from "@/lib/football-types";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/sample-data";

type PreviewMatch = {
  awayLabel: string;
  homeLabel: string;
  position: number;
  roundNumber: number;
  sectionLabel: string;
  stage: "league" | FootballKnockoutStage;
};

const requiredKnockoutTeams: Record<FootballKnockoutStage, number> = {
  quarter_final: 8,
  semi_final: 4,
  final: 2,
};

function pluralise(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatTournamentMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function createLeaguePreview(teamIds: string[], teamNames: Map<string, string>) {
  const rotation: Array<string | null> = [...teamIds];

  if (rotation.length % 2 === 1) {
    rotation.push(null);
  }

  const matches: PreviewMatch[] = [];
  const teamCount = rotation.length;

  for (let roundIndex = 0; roundIndex < teamCount - 1; roundIndex += 1) {
    let position = 1;

    for (let pairIndex = 0; pairIndex < teamCount / 2; pairIndex += 1) {
      const first = rotation[pairIndex];
      const second = rotation[teamCount - 1 - pairIndex];

      if (first && second) {
        const reverseHome = (roundIndex + pairIndex) % 2 === 1;
        const homeTeamId = reverseHome ? second : first;
        const awayTeamId = reverseHome ? first : second;

        matches.push({
          awayLabel: teamNames.get(awayTeamId) ?? "Team",
          homeLabel: teamNames.get(homeTeamId) ?? "Team",
          position,
          roundNumber: roundIndex + 1,
          sectionLabel: `Round ${roundIndex + 1}`,
          stage: "league",
        });
        position += 1;
      }
    }

    rotation.splice(1, 0, rotation.pop() ?? null);
  }

  return matches;
}

function createKnockoutPreview(
  teamIds: string[],
  teamNames: Map<string, string>,
  startStage: FootballKnockoutStage,
) {
  const stageOrder: FootballKnockoutStage[] =
    startStage === "quarter_final"
      ? ["quarter_final", "semi_final", "final"]
      : startStage === "semi_final"
        ? ["semi_final", "final"]
        : ["final"];
  const matches: PreviewMatch[] = [];

  stageOrder.forEach((stage, roundIndex) => {
    const matchCount = 2 ** (stageOrder.length - roundIndex - 1);

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
      const position = matchIndex + 1;

      if (roundIndex === 0) {
        const homeTeamId = teamIds[matchIndex];
        const awayTeamId = teamIds[teamIds.length - 1 - matchIndex];

        matches.push({
          awayLabel: teamNames.get(awayTeamId) ?? "Team",
          homeLabel: teamNames.get(homeTeamId) ?? "Team",
          position,
          roundNumber: roundIndex + 1,
          sectionLabel: footballStageLabels[stage],
          stage,
        });
      } else {
        const previousStageLabel =
          footballStageLabels[stageOrder[roundIndex - 1]];
        const homeSource = matchIndex * 2 + 1;
        const awaySource = matchIndex * 2 + 2;

        matches.push({
          awayLabel: `Winner ${previousStageLabel} ${awaySource}`,
          homeLabel: `Winner ${previousStageLabel} ${homeSource}`,
          position,
          roundNumber: roundIndex + 1,
          sectionLabel: footballStageLabels[stage],
          stage,
        });
      }
    }
  });

  return matches;
}

function createGroupKnockoutPreview(
  teamIds: string[],
  teamNames: Map<string, string>,
) {
  const groupASize = Math.ceil(teamIds.length / 2);
  const groupA = teamIds.slice(0, groupASize);
  const groupB = teamIds.slice(groupASize);
  const groupAMatches = createLeaguePreview(groupA, teamNames).map((match) => ({
    ...match,
    sectionLabel: `Group A · Round ${match.roundNumber}`,
  }));
  const groupBMatches = createLeaguePreview(groupB, teamNames).map((match) => ({
    ...match,
    position: groupAMatches.length + match.position,
    sectionLabel: `Group B · Round ${match.roundNumber}`,
  }));
  const groupRoundCount = Math.max(
    ...groupAMatches.map((match) => match.roundNumber),
    ...groupBMatches.map((match) => match.roundNumber),
  );

  return [
    ...groupAMatches,
    ...groupBMatches,
    {
      awayLabel: "Group B runner-up",
      homeLabel: "Group A winner",
      position: 1,
      roundNumber: groupRoundCount + 1,
      sectionLabel: "Semi-finals",
      stage: "semi_final",
    },
    {
      awayLabel: "Group A runner-up",
      homeLabel: "Group B winner",
      position: 2,
      roundNumber: groupRoundCount + 1,
      sectionLabel: "Semi-finals",
      stage: "semi_final",
    },
    {
      awayLabel: "Winner Semi-final 2",
      homeLabel: "Winner Semi-final 1",
      position: 1,
      roundNumber: groupRoundCount + 2,
      sectionLabel: "Final",
      stage: "final",
    },
  ] satisfies PreviewMatch[];
}

export function AdminFootballTournamentForm({
  eventId,
  matchMinutes,
  teams,
}: {
  eventId: string;
  matchMinutes: number;
  teams: Team[];
}) {
  const [format, setFormat] =
    useState<FootballTournamentFormat>("group_knockout");
  const [selectedTeamIds, setSelectedTeamIds] = useState(() =>
    teams.map((team) => team.id),
  );
  const [startStage, setStartStage] = useState<
    "quarter_final" | "semi_final" | "final"
  >(
    teams.length >= 8
      ? "quarter_final"
      : teams.length >= 4
        ? "semi_final"
        : "final",
  );

  function prepareCreation(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("creation_id");
    if (input instanceof HTMLInputElement && !input.value) {
      input.value = crypto.randomUUID();
    }
  }

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );
  const selectedTeams = useMemo(
    () => teams.filter((team) => selectedTeamIds.includes(team.id)),
    [selectedTeamIds, teams],
  );
  const requiredTeamCount = requiredKnockoutTeams[startStage];
  const previewMatches = useMemo(
    () => {
      if (selectedTeamIds.length < 2) {
        return [];
      }

      if (
        format === "knockout" &&
        selectedTeamIds.length !== requiredTeamCount
      ) {
        return [];
      }

      if (format === "group_knockout" && selectedTeamIds.length < 4) {
        return [];
      }

      return format === "league"
        ? createLeaguePreview(selectedTeamIds, teamNames)
        : format === "group_knockout"
          ? createGroupKnockoutPreview(selectedTeamIds, teamNames)
          : createKnockoutPreview(selectedTeamIds, teamNames, startStage);
    },
    [format, selectedTeamIds, startStage, teamNames, requiredTeamCount],
  );
  const previewRounds = useMemo(
    () =>
      [...new Set(previewMatches.map((match) => match.sectionLabel))].map(
        (sectionLabel) => ({
          matches: previewMatches.filter(
            (match) => match.sectionLabel === sectionLabel,
          ),
          sectionLabel,
        }),
      ),
    [previewMatches],
  );
  const knockoutTeamCountIsValid =
    format !== "knockout" || selectedTeamIds.length === requiredTeamCount;
  const groupKnockoutTeamCountIsValid =
    format !== "group_knockout" || selectedTeamIds.length >= 4;
  const hasEnoughTeams = selectedTeamIds.length >= 2;
  const totalMatchMinutes = previewMatches.length * matchMinutes;
  const previewRoundCount =
    previewMatches.length === 0
      ? 0
      : Math.max(...previewMatches.map((match) => match.roundNumber));

  return (
    <form
      action={createFootballTournament}
      className="space-y-6"
      onSubmit={prepareCreation}
    >
      <input name="event_id" type="hidden" value={eventId} />
      <input name="creation_id" type="hidden" />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="name">
          Tournament name
        </label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Summer Cup"
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          Tournament type
        </legend>
        <div className="grid gap-3 lg:grid-cols-3">
          <label
            className={cn(
              "cursor-pointer rounded-lg border-2 p-4 transition",
              format === "group_knockout"
                ? "border-brand-orange bg-brand-orange/10"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              checked={format === "group_knockout"}
              className="sr-only"
              name="format"
              onChange={() => setFormat("group_knockout")}
              type="radio"
              value="group_knockout"
            />
            <Trophy className="h-5 w-5 text-brand-orange-dark" />
            <span className="mt-3 block font-semibold text-slate-950">
              Groups + knockout
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Split teams into two groups, then semi-finals and final.
            </span>
          </label>
          <label
            className={cn(
              "cursor-pointer rounded-lg border-2 p-4 transition",
              format === "league"
                ? "border-brand-orange bg-brand-orange/10"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              checked={format === "league"}
              className="sr-only"
              name="format"
              onChange={() => setFormat("league")}
              type="radio"
              value="league"
            />
            <ListOrdered className="h-5 w-5 text-brand-orange-dark" />
            <span className="mt-3 block font-semibold text-slate-950">
              League table
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Every team plays every other team. Win 3, draw 1, loss 0.
            </span>
          </label>
          <label
            className={cn(
              "cursor-pointer rounded-lg border-2 p-4 transition",
              format === "knockout"
                ? "border-brand-orange bg-brand-orange/10"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              checked={format === "knockout"}
              className="sr-only"
              name="format"
              onChange={() => setFormat("knockout")}
              type="radio"
              value="knockout"
            />
            <Brackets className="h-5 w-5 text-brand-orange-dark" />
            <span className="mt-3 block font-semibold text-slate-950">
              Knockout cup
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Quarter-finals, semi-finals and final with winner progression.
            </span>
          </label>
        </div>
      </fieldset>

      {format === "knockout" ? (
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-slate-800"
            htmlFor="start-stage"
          >
            Opening round
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="start-stage"
            name="start_stage"
            onChange={(event) =>
              setStartStage(event.target.value as typeof startStage)
            }
            value={startStage}
          >
            <option value="quarter_final">Quarter-finals — 8 teams</option>
            <option value="semi_final">Semi-finals — 4 teams</option>
            <option value="final">Final only — 2 teams</option>
          </select>
          <p className="text-xs text-slate-500">
            Select exactly{" "}
            {startStage === "quarter_final"
              ? "8"
              : startStage === "semi_final"
                ? "4"
                : "2"}{" "}
            teams below.
          </p>
        </div>
      ) : (
        <input name="start_stage" type="hidden" value="" />
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">
          Football teams
        </legend>
        <p className="text-sm text-slate-500">
          Teams are seeded in the order shown. For Groups + knockout, the first
          half go into Group A and the rest go into Group B.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((team) => (
            <label
              className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-brand-orange/60"
              key={team.id}
            >
              <input
                checked={selectedTeamIds.includes(team.id)}
                className="peer sr-only"
                name="team_ids"
                onChange={(event) => {
                  setSelectedTeamIds((currentTeamIds) =>
                    event.target.checked
                      ? teams
                          .map((availableTeam) => availableTeam.id)
                          .filter(
                            (teamId) =>
                              teamId === team.id ||
                              currentTeamIds.includes(teamId),
                          )
                      : currentTeamIds.filter((teamId) => teamId !== team.id),
                  );
                }}
                type="checkbox"
                value={team.id}
              />
              <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-transparent peer-checked:border-brand-orange peer-checked:bg-brand-orange peer-checked:text-brand-charcoal">
                <Check className="h-3.5 w-3.5" />
              </span>
              <TeamBadge
                badge={team.badge}
                badgeUrl={team.badgeUrl}
                className="h-9 w-9 text-sm"
                colour={team.colour}
                name={team.name}
              />
              <span className="font-medium text-slate-900">{team.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-semibold text-slate-950">
                Tournament preview
              </h3>
              <p className="text-sm text-slate-500">
                Based on {pluralise(selectedTeams.length, "selected team")}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-brand-orange/15 px-3 py-1 text-brand-orange-dark">
                {pluralise(previewMatches.length, "fixture")}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {pluralise(previewRoundCount, "round")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTournamentMinutes(totalMatchMinutes)} match time
              </span>
            </div>
          </div>
        </div>

        {!hasEnoughTeams ? (
          <p className="px-4 py-5 text-sm text-slate-600">
            Select at least two teams to preview fixtures.
          </p>
        ) : !knockoutTeamCountIsValid ? (
          <p className="px-4 py-5 text-sm text-red-700">
            This cup round needs exactly {requiredTeamCount} teams. Select{" "}
            {requiredTeamCount - selectedTeamIds.length > 0
              ? `${requiredTeamCount - selectedTeamIds.length} more`
              : `${selectedTeamIds.length - requiredTeamCount} fewer`}{" "}
            to preview a valid bracket.
          </p>
        ) : !groupKnockoutTeamCountIsValid ? (
          <p className="px-4 py-5 text-sm text-red-700">
            Groups + knockout needs at least 4 teams. Select{" "}
            {4 - selectedTeamIds.length} more{" "}
            to preview the group fixtures, semi-finals and final.
          </p>
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {previewRounds.map((section) => (
              <div
                className="rounded-md border border-slate-200 bg-white"
                key={section.sectionLabel}
              >
                <div className="border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-500">
                  {section.sectionLabel}
                </div>
                <ol className="divide-y divide-slate-100">
                  {section.matches.map((match) => (
                    <li
                      className="grid grid-cols-[2rem_1fr] gap-2 px-3 py-2 text-sm"
                      key={`${match.roundNumber}-${match.position}`}
                    >
                      <span className="font-semibold text-slate-400">
                        {match.position}
                      </span>
                      <span className="min-w-0 text-slate-800">
                        <span className="font-semibold">{match.homeLabel}</span>{" "}
                        <span className="text-slate-400">vs</span>{" "}
                        <span className="font-semibold">{match.awayLabel}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      <PendingSubmitButton
        className="w-full sm:w-auto"
        pendingLabel="Creating fixtures..."
        type="submit"
      >
        Create tournament & fixtures
      </PendingSubmitButton>
    </form>
  );
}

"use client";

import {
  CircleMinus,
  CirclePlus,
  Clock3,
  Flag,
  Pause,
  Play,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  adjustFootballMatchScore,
  setFootballMatchScore,
  updateFootballMatchLifecycle,
  updateFootballMatchSchedule,
} from "@/app/admin/events/[eventId]/football/actions";
import { KickoffInput } from "@/components/kickoff-input";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPill } from "@/components/status-pill";
import { TeamBadge } from "@/components/team-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFootballClock } from "@/lib/football-clock";
import {
  footballStageLabels,
  footballStatusLabels,
  isLiveFootballMatch,
  type FootballMatch,
} from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";

function HiddenMatchFields({
  eventId,
  match,
}: {
  eventId: string;
  match: FootballMatch;
}) {
  return (
    <>
      <input name="event_id" type="hidden" value={eventId} />
      <input name="tournament_id" type="hidden" value={match.tournamentId} />
      <input name="match_id" type="hidden" value={match.id} />
    </>
  );
}

function TeamScoreControl({
  adjustScore,
  eventId,
  match,
  pending,
  score,
  side,
  team,
}: {
  adjustScore: (formData: FormData) => Promise<void>;
  eventId: string;
  match: FootballMatch;
  pending: boolean;
  score: number;
  side: "home" | "away";
  team?: Team;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      {team ? (
        <TeamBadge
          badge={team.badge}
          badgeUrl={team.badgeUrl}
          className="h-12 w-12 text-lg"
          colour={team.colour}
          name={team.name}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
          TBD
        </div>
      )}
      <p className="mt-2 max-w-full truncate text-center text-sm font-semibold text-slate-900">
        {team?.name ?? "Winner TBD"}
      </p>
      <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">
        {score}
      </p>
      {isLiveFootballMatch(match.status) ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[-1, 1].map((delta) => (
            <form action={adjustScore} key={delta}>
              <HiddenMatchFields eventId={eventId} match={match} />
              <input name="side" type="hidden" value={side} />
              <input name="delta" type="hidden" value={delta} />
              <Button
                aria-label={`${delta > 0 ? "Add" : "Remove"} ${team?.name ?? side} goal`}
                disabled={pending || (delta < 0 && score === 0)}
                size="icon"
                type="submit"
                variant={delta > 0 ? "default" : "outline"}
              >
                {delta > 0 ? (
                  <CirclePlus className="h-5 w-5" />
                ) : (
                  <CircleMinus className="h-5 w-5" />
                )}
              </Button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminFootballMatchCard({
  eventId,
  match,
  matchMinutes,
  teams,
}: {
  eventId: string;
  match: FootballMatch;
  matchMinutes: number;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const isLive = isLiveFootballMatch(match.status);
  const [scores, setScores] = useState({
    away: match.awayScore,
    home: match.homeScore,
  });
  const [scorePending, setScorePending] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setScores({ away: match.awayScore, home: match.homeScore });
  }, [match.awayScore, match.homeScore]);

  useEffect(() => {
    if (match.status !== "live") {
      setNow(null);
      return;
    }

    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [match.status, match.startedAt, match.secondHalfStartedAt]);

  async function adjustScore(formData: FormData) {
    if (scorePending) return;

    const side = String(formData.get("side")) as "home" | "away";
    const delta = Number(formData.get("delta"));
    const previousScores = scores;

    setScores((current) => ({
      ...current,
      [side]: Math.max(0, current[side] + delta),
    }));
    setScorePending(true);

    try {
      await adjustFootballMatchScore(formData);
    } catch (error) {
      setScores(previousScores);
      throw error;
    } finally {
      setScorePending(false);
    }
  }

  const clock = now ? getFootballClock(match, matchMinutes, now) : null;
  const statusTone =
    isLive
      ? "live"
      : match.status === "full_time"
        ? "neutral"
        : "planned";

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {footballStageLabels[match.stage]}
            {match.stage === "league" ? ` · Round ${match.roundNumber}` : ""}
          </p>
          {match.venue ? (
            <p className="mt-1 truncate text-xs text-slate-500">
              {match.venue}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {match.status === "halftime" ? (
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-700">
              HT
            </span>
          ) : clock ? (
            <div className="text-right">
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  clock.addedTime ? "text-red-600" : "text-slate-900"
                }`}
              >
                {clock.clockLabel}
              </p>
              <p className="text-[0.65rem] font-medium text-slate-500">
                {clock.addedTime ? "Added time" : clock.periodLabel}
              </p>
            </div>
          ) : null}
          <StatusPill tone={statusTone}>
            {footballStatusLabels[match.status]}
          </StatusPill>
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="flex items-start gap-3">
          <TeamScoreControl
            adjustScore={adjustScore}
            eventId={eventId}
            match={match}
            pending={scorePending}
            score={scores.home}
            side="home"
            team={homeTeam}
          />
          <span className="pt-16 text-sm font-bold uppercase text-slate-400">
            vs
          </span>
          <TeamScoreControl
            adjustScore={adjustScore}
            eventId={eventId}
            match={match}
            pending={scorePending}
            score={scores.away}
            side="away"
            team={awayTeam}
          />
        </div>

        {match.status === "scheduled" ? (
          <div className="mt-6 space-y-3">
            <form
              action={updateFootballMatchSchedule}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <HiddenMatchFields eventId={eventId} match={match} />
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-slate-600"
                  htmlFor={`kickoff-${match.id}`}
                >
                  Kickoff
                </label>
                <KickoffInput
                  defaultIso={match.kickoffAt}
                  id={`kickoff-${match.id}`}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-slate-600"
                  htmlFor={`venue-${match.id}`}
                >
                  Pitch / venue
                </label>
                <Input
                  defaultValue={match.venue ?? ""}
                  id={`venue-${match.id}`}
                  name="venue"
                  placeholder="Main pitch"
                />
              </div>
              <PendingSubmitButton
                className="self-end"
                pendingLabel="Saving..."
                type="submit"
                variant="outline"
              >
                <Save className="h-4 w-4" />
                Save
              </PendingSubmitButton>
            </form>
            <form action={updateFootballMatchLifecycle}>
              <HiddenMatchFields eventId={eventId} match={match} />
              <input name="command" type="hidden" value="start" />
              <PendingSubmitButton
                className="w-full"
                disabled={!homeTeam || !awayTeam}
                pendingLabel="Starting..."
                type="submit"
              >
                <Play className="h-4 w-4" />
                Start live match
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}

        {isLive ? (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {match.status === "halftime" || !match.secondHalfStartedAt ? (
              <form action={updateFootballMatchLifecycle}>
                <HiddenMatchFields eventId={eventId} match={match} />
                <input
                  name="command"
                  type="hidden"
                  value={match.status === "halftime" ? "resume" : "halftime"}
                />
                <PendingSubmitButton
                  className="w-full"
                  pendingLabel="Updating..."
                  type="submit"
                  variant="outline"
                >
                  {match.status === "halftime" ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {match.status === "halftime" ? "Start second half" : "Half-time"}
                </PendingSubmitButton>
              </form>
            ) : null}
            <form
              action={updateFootballMatchLifecycle}
              className={match.secondHalfStartedAt ? "sm:col-span-2" : undefined}
            >
              <HiddenMatchFields eventId={eventId} match={match} />
              <input name="command" type="hidden" value="finish" />
              <PendingSubmitButton
                className="w-full"
                pendingLabel="Publishing..."
                type="submit"
              >
                <Flag className="h-4 w-4" />
                Publish full-time
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}

        {match.status === "full_time" ? (
          <form action={updateFootballMatchLifecycle} className="mt-6">
            <HiddenMatchFields eventId={eventId} match={match} />
            <input name="command" type="hidden" value="reopen" />
            <PendingSubmitButton
              className="w-full"
              pendingLabel="Reopening..."
              type="submit"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen to correct result
            </PendingSubmitButton>
          </form>
        ) : null}

        {isLive ? (
          <details className="mt-4 rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-600">
              Correct exact score
            </summary>
            <form
              action={setFootballMatchScore}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-slate-200 p-3"
            >
              <HiddenMatchFields eventId={eventId} match={match} />
              <Input
                aria-label="Home score"
                defaultValue={scores.home}
                min={0}
                name="home_score"
                required
                type="number"
              />
              <Input
                aria-label="Away score"
                defaultValue={scores.away}
                min={0}
                name="away_score"
                required
                type="number"
              />
              <Button size="icon" type="submit" variant="outline">
                <Save className="h-4 w-4" />
              </Button>
            </form>
          </details>
        ) : null}

        {match.kickoffAt && match.status === "scheduled" ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            Kickoff is shown in each viewer&apos;s local time.
          </p>
        ) : null}
      </div>
    </article>
  );
}

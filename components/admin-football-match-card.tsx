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
  Timer,
} from "lucide-react";
import Link from "next/link";
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
import {
  formatFootballDuration,
  getFootballClock,
} from "@/lib/football-clock";
import {
  footballStageLabels,
  footballStatusLabels,
  isLiveFootballMatch,
  type FootballMatch,
} from "@/lib/football-types";
import type { Team } from "@/lib/sample-data";

function HiddenMatchFields({
  eventId,
  focused,
  match,
}: {
  eventId: string;
  focused?: boolean;
  match: FootballMatch;
}) {
  return (
    <>
      <input name="event_id" type="hidden" value={eventId} />
      <input name="tournament_id" type="hidden" value={match.tournamentId} />
      <input name="match_id" type="hidden" value={match.id} />
      <input
        name="expected_version"
        type="hidden"
        value={match.controlVersion}
      />
      {focused ? <input name="focused" type="hidden" value="true" /> : null}
    </>
  );
}

function TeamScoreControl({
  adjustScore,
  eventId,
  focused,
  match,
  pending,
  refereeControlled,
  score,
  side,
  team,
}: {
  adjustScore: (formData: FormData) => Promise<void>;
  eventId: string;
  focused: boolean;
  match: FootballMatch;
  pending: boolean;
  refereeControlled: boolean;
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
      <p className="mt-2 text-5xl font-black text-slate-950">
        {score}
      </p>
      {isLiveFootballMatch(match.status) ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[-1, 1].map((delta) => (
            <form action={adjustScore} key={delta}>
              <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
              <input name="side" type="hidden" value={side} />
              <input name="delta" type="hidden" value={delta} />
              <Button
                aria-label={`${delta > 0 ? "Add" : "Remove"} ${team?.name ?? side} goal`}
                disabled={
                  refereeControlled || pending || (delta < 0 && score === 0)
                }
                className={focused ? "h-12 w-12" : undefined}
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
  focused = false,
  match,
  matchMinutes,
  teams,
}: {
  eventId: string;
  focused?: boolean;
  match: FootballMatch;
  matchMinutes: number;
  teams: Team[];
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const isLive = isLiveFootballMatch(match.status);
  const refereeControlled = Boolean(match.controllerDeviceId);
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
  }, [
    match.stoppageStartedAt,
    match.status,
    match.startedAt,
    match.secondHalfStartedAt,
  ]);

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
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
            <div className="text-right">
              <p className="font-mono text-sm font-semibold tabular-nums text-slate-700">
                HT
              </p>
              <p className="text-[0.65rem] font-medium text-slate-500">
                1H added +{formatFootballDuration(match.firstHalfStoppageSeconds)}
              </p>
            </div>
          ) : clock ? (
            <div className="text-right">
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  clock.isTrackingStoppage || clock.isInAddedTime
                    ? "text-amber-700"
                    : "text-slate-900"
                }`}
              >
                {clock.addedTimePlayedLabel ?? clock.clockLabel}
              </p>
              <p className="text-[0.65rem] font-medium text-slate-500">
                {clock.isTrackingStoppage
                  ? "Stoppage being tracked"
                  : clock.isInAddedTime
                    ? `of ${clock.addedTimeNeededLabel} added`
                    : clock.periodLabel}
              </p>
              <p className="text-[0.65rem] font-semibold text-amber-700">
                Added time needed {clock.addedTimeNeededLabel}
              </p>
            </div>
          ) : null}
          <StatusPill tone={statusTone}>
            {footballStatusLabels[match.status]}
          </StatusPill>
        </div>
      </div>

      <div className="px-4 py-5">
        {refereeControlled ? (
          <p className="mb-4 border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
            Referee mode currently controls this match. Open referee mode to make changes.
          </p>
        ) : null}
        <div className={`flex items-start gap-2 sm:gap-3 ${focused ? "py-3 sm:py-6" : ""}`}>
          <TeamScoreControl
            adjustScore={adjustScore}
            eventId={eventId}
            focused={focused}
            match={match}
            pending={scorePending}
            refereeControlled={refereeControlled}
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
            focused={focused}
            match={match}
            pending={scorePending}
            refereeControlled={refereeControlled}
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
              <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-slate-600"
                  htmlFor={`kickoff-${match.id}`}
                >
                  Kickoff
                </label>
                <KickoffInput
                  defaultIso={match.kickoffAt}
                  disabled={refereeControlled}
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
                  disabled={refereeControlled}
                  id={`venue-${match.id}`}
                  name="venue"
                  placeholder="Main pitch"
                />
              </div>
              <PendingSubmitButton
                className="self-end"
                disabled={refereeControlled}
                pendingLabel="Saving..."
                type="submit"
                variant="outline"
              >
                <Save className="h-4 w-4" />
                Save
              </PendingSubmitButton>
            </form>
            <form action={updateFootballMatchLifecycle}>
              <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
              <input name="command" type="hidden" value="start" />
              <PendingSubmitButton
                className="w-full"
                disabled={refereeControlled || !homeTeam || !awayTeam}
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
            {match.status === "live" ? (
              <form action={updateFootballMatchLifecycle} className="sm:col-span-2">
                <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
                <input
                  name="command"
                  type="hidden"
                  value={
                    match.stoppageStartedAt
                      ? "end_stoppage"
                      : "start_stoppage"
                  }
                />
                <PendingSubmitButton
                  className="w-full"
                  disabled={refereeControlled}
                  pendingLabel="Updating clock..."
                  type="submit"
                  variant={match.stoppageStartedAt ? "default" : "outline"}
                >
                  {match.stoppageStartedAt ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {match.stoppageStartedAt
                    ? "Stop stoppage tracking"
                    : "Start stoppage tracking"}
                </PendingSubmitButton>
              </form>
            ) : null}
            {match.status === "halftime" || !match.secondHalfStartedAt ? (
              <form action={updateFootballMatchLifecycle}>
                <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
                <input
                  name="command"
                  type="hidden"
                  value={
                    match.status === "halftime" ? "start_second_half" : "halftime"
                  }
                />
                <PendingSubmitButton
                  className="w-full"
                  disabled={refereeControlled}
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
            >
              <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
              <input name="command" type="hidden" value="finish" />
              <PendingSubmitButton
                className="w-full"
                disabled={refereeControlled}
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
            <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
            <input name="command" type="hidden" value="reopen" />
            <PendingSubmitButton
              className="w-full"
              disabled={refereeControlled}
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
              <HiddenMatchFields eventId={eventId} focused={focused} match={match} />
              <Input
                aria-label="Home score"
                defaultValue={scores.home}
                disabled={refereeControlled}
                min={0}
                name="home_score"
                required
                type="number"
              />
              <Input
                aria-label="Away score"
                defaultValue={scores.away}
                disabled={refereeControlled}
                min={0}
                name="away_score"
                required
                type="number"
              />
              <Button
                disabled={refereeControlled}
                size="icon"
                type="submit"
                variant="outline"
              >
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

        {!focused && ["scheduled", "live", "halftime"].includes(match.status) ? (
          <Button asChild className="mt-4 w-full" variant="secondary">
            <Link href={`/admin/events/${eventId}/football/matches/${match.id}`}>
              <Timer className="h-4 w-4" />
              Open referee mode
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

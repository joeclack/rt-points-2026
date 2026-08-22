"use client";

import {
  ArrowLeft,
  CircleMinus,
  CirclePlus,
  Expand,
  Flag,
  Minimize,
  Play,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import {
  adjustBasketballScore,
  updateBasketballLifecycle,
} from "@/app/admin/events/[eventId]/basketball/actions";
import { TeamBadge } from "@/components/team-badge";
import {
  basketballStageLabels,
  type BasketballMatch,
} from "@/lib/basketball-types";
import type { Team } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

function MatchFields({
  deviceId,
  eventId,
  match,
}: {
  deviceId: string | null;
  eventId: string;
  match: BasketballMatch;
}) {
  return (
    <>
      <input name="event_id" type="hidden" value={eventId} />
      <input name="tournament_id" type="hidden" value={match.tournamentId} />
      <input name="match_id" type="hidden" value={match.id} />
      <input name="device_id" type="hidden" value={deviceId ?? ""} />
      <input name="command_id" type="hidden" />
      <input
        name="expected_version"
        type="hidden"
        value={match.controlVersion}
      />
      <input name="focused" type="hidden" value="true" />
    </>
  );
}

function RefSubmitButton({
  children,
  className,
  disabled,
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "flex min-h-16 w-full items-center justify-center gap-3 border px-4 text-sm font-bold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function ScoreSide({
  adjustScore,
  canControl,
  deviceId,
  eventId,
  isOnline,
  match,
  pending,
  score,
  side,
  team,
}: {
  adjustScore: (formData: FormData) => Promise<void>;
  canControl: boolean;
  deviceId: string | null;
  eventId: string;
  isOnline: boolean;
  match: BasketballMatch;
  pending: boolean;
  score: number;
  side: "home" | "away";
  team?: Team;
}) {
  const canScore = match.status === "live" && canControl;

  return (
    <div className="flex min-w-0 flex-col items-center px-2 py-5">
      <TeamBadge
        badge={team?.badge ?? "?"}
        badgeUrl={team?.badgeUrl ?? null}
        className="h-10 w-10 border border-white/15 text-sm"
        colour={team?.colour ?? "#303733"}
        name={team?.name ?? "Team"}
      />
      <p className="mt-2 w-full truncate text-center text-xs font-semibold text-zinc-300">
        {team?.name ?? "TBD"}
      </p>
      <p className="mt-1 font-mono text-6xl font-bold tabular-nums text-white">
        {score}
      </p>

      {canScore ? (
        <div className="mt-3 grid w-full max-w-44 grid-cols-2 gap-2">
          {[-1, 1, 2, 3].map((points) => (
            <form action={adjustScore} key={points}>
              <MatchFields deviceId={deviceId} eventId={eventId} match={match} />
              <input name="side" type="hidden" value={side} />
              <input name="points" type="hidden" value={points} />
              <button
                aria-label={`${points > 0 ? `Add ${points}` : "Remove 1"} for ${team?.name ?? side}`}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-1 border text-white transition-colors disabled:opacity-35",
                  points > 0
                    ? "border-emerald-500 bg-emerald-500/15 active:bg-emerald-500/30"
                    : "border-zinc-700 bg-zinc-900 active:bg-zinc-800",
                )}
                disabled={
                  !isOnline || pending || (points < 0 && score === 0)
                }
                title={points > 0 ? `Add ${points}` : "Remove point"}
                type="submit"
              >
                {points > 0 ? (
                  <>
                    <CirclePlus className="h-6 w-6" />
                    <span className="font-mono text-sm">+{points}</span>
                  </>
                ) : (
                  <CircleMinus className="h-6 w-6" />
                )}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatMatchTimer(
  startedAt: string | null,
  gameMinutes: number,
  now: number | null,
) {
  if (!startedAt || !now) {
    return `${gameMinutes}:00`;
  }

  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  const remaining = Math.max(0, gameMinutes * 60 - elapsed);

  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
}

export function BasketballRefereeConsole({
  error,
  eventId,
  gameMinutes,
  match,
  message,
  returnHref,
  teams,
  tournamentName,
}: {
  error?: string;
  eventId: string;
  gameMinutes: number;
  match: BasketballMatch;
  message?: string;
  returnHref: string;
  teams: Team[];
  tournamentName: string;
}) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = teams.find((team) => team.id === match.awayTeamId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [scorePending, setScorePending] = useState(false);
  const [clockNow, setClockNow] = useState<number | null>(null);
  const [scores, setScores] = useState({
    away: match.awayScore,
    home: match.homeScore,
  });

  useEffect(() => {
    const storageKey = "rt-points-referee-device-id";
    let nextDeviceId = crypto.randomUUID();
    try {
      const storedDeviceId = window.localStorage.getItem(storageKey);
      nextDeviceId = storedDeviceId || nextDeviceId;
      if (!storedDeviceId) window.localStorage.setItem(storageKey, nextDeviceId);
    } catch {
      // Private browsing can deny storage; the in-memory ID still protects this session.
    }
    setDeviceId(nextDeviceId);
  }, []);

  useEffect(() => {
    setScores({ away: match.awayScore, home: match.homeScore });
  }, [match.awayScore, match.homeScore]);

  useEffect(() => {
    if (match.status === "scheduled") {
      setClockNow(null);
      return;
    }

    const tick = () => setClockNow(Date.now());
    tick();

    if (match.status !== "live") {
      return;
    }

    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [match.startedAt, match.status]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    updateConnection();
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    type WakeLockHandle = {
      addEventListener: (type: "release", listener: () => void) => void;
      release: () => Promise<void>;
    };
    const wakeLockNavigator = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> };
    };
    let handle: WakeLockHandle | null = null;

    async function requestWakeLock() {
      if (
        match.status !== "live" ||
        document.visibilityState !== "visible" ||
        !wakeLockNavigator.wakeLock
      ) {
        return;
      }

      try {
        handle = await wakeLockNavigator.wakeLock.request("screen");
        setWakeLockActive(true);
        handle.addEventListener("release", () => {
          handle = null;
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !handle) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (handle) void handle.release();
    };
  }, [match.status]);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    updateFullscreen();
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  async function adjustScore(formData: FormData) {
    if (scorePending) return;

    formData.set("command_id", crypto.randomUUID());
    const side = String(formData.get("side")) as "home" | "away";
    const points = Number(formData.get("points"));
    const previousScores = scores;
    setScores((current) => ({
      ...current,
      [side]: Math.max(0, current[side] + points),
    }));
    setScorePending(true);

    try {
      await adjustBasketballScore(formData);
    } catch (scoreError) {
      setScores(previousScores);
      throw scoreError;
    } finally {
      setScorePending(false);
    }
  }

  function prepareCommand(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("command_id");
    if (input instanceof HTMLInputElement) input.value = crypto.randomUUID();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setIsFullscreen(false);
    }
  }

  const hasControl = Boolean(
    deviceId && match.controllerDeviceId === deviceId,
  );
  const controlledByAnother = Boolean(
    match.controllerDeviceId && !hasControl,
  );
  const statusLabel =
    match.status === "live"
      ? "LIVE"
      : match.status === "full_time"
        ? "FULL-TIME"
        : "READY";

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#050706] text-white [padding-bottom:env(safe-area-inset-bottom)] [padding-top:env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
          <Link
            aria-label="Exit referee mode"
            className="flex h-11 w-11 items-center justify-center text-zinc-300 active:text-white"
            href={returnHref}
            title="Exit referee mode"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 px-2 text-center">
            <p className="truncate text-[0.65rem] font-bold uppercase text-zinc-500">
              {tournamentName}
            </p>
            <p className="truncate text-xs font-semibold text-zinc-200">
              {basketballStageLabels[match.stage]}
            </p>
          </div>
          <button
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="flex h-11 w-11 items-center justify-center text-zinc-300 active:text-white"
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            type="button"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Expand className="h-5 w-5" />
            )}
          </button>
        </header>

        {error || message ? (
          <div
            className={cn(
              "border-b px-4 py-3 text-center text-sm font-semibold",
              error
                ? "border-red-800 bg-red-950 text-red-200"
                : "border-emerald-800 bg-emerald-950 text-emerald-200",
            )}
          >
            {error ?? message}
          </div>
        ) : null}

        <section className="grid grid-cols-2 border-b border-zinc-800 text-[0.65rem] font-bold uppercase">
          <div
            className={cn(
              "flex items-center justify-center gap-2 border-r border-zinc-800 py-2.5",
              isOnline ? "text-emerald-300" : "text-red-300",
            )}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isOnline ? "Online" : "Offline"}
          </div>
          <div
            className={cn(
              "flex items-center justify-center py-2.5",
              hasControl ? "text-[#d9ff43]" : "text-zinc-500",
            )}
          >
            {hasControl
              ? wakeLockActive
                ? "Control · screen awake"
                : "Control"
              : "View only"}
          </div>
        </section>

        <section className="border-b border-zinc-800 px-4 pb-5 pt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-400">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                match.status === "live" ? "bg-emerald-400" : "bg-zinc-600",
              )}
            />
            {statusLabel}
          </div>
          <p className="mt-2 font-mono text-7xl font-bold leading-none tabular-nums text-[#d9ff43]">
            {scores.home}-{scores.away}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-zinc-400">
            <Timer className="h-4 w-4" />
            <span className="font-mono text-xl font-bold tabular-nums text-white">
              {formatMatchTimer(match.startedAt, gameMinutes, clockNow)}
            </span>
            <span className="text-xs font-semibold uppercase">Timer</span>
          </div>
        </section>

        <section className="grid grid-cols-[1fr_auto_1fr] items-start border-b border-zinc-800">
          <ScoreSide
            adjustScore={adjustScore}
            canControl={hasControl}
            deviceId={deviceId}
            eventId={eventId}
            isOnline={isOnline}
            match={match}
            pending={scorePending}
            score={scores.home}
            side="home"
            team={homeTeam}
          />
          <span className="pt-20 text-xs font-bold text-zinc-600">VS</span>
          <ScoreSide
            adjustScore={adjustScore}
            canControl={hasControl}
            deviceId={deviceId}
            eventId={eventId}
            isOnline={isOnline}
            match={match}
            pending={scorePending}
            score={scores.away}
            side="away"
            team={awayTeam}
          />
        </section>

        <div className="mt-auto grid gap-2 p-3">
          {!hasControl ? (
            <form
              action={updateBasketballLifecycle}
              onSubmit={(event) => {
                if (
                  controlledByAnother &&
                  !window.confirm("Take game control from the other referee device?")
                ) {
                  event.preventDefault();
                  return;
                }
                prepareCommand(event);
              }}
            >
              <MatchFields deviceId={deviceId} eventId={eventId} match={match} />
              <input
                name="command"
                type="hidden"
                value={controlledByAnother ? "take_control" : "claim_control"}
              />
              <RefSubmitButton
                className="border-[#d9ff43] bg-[#d9ff43]/10 text-[#d9ff43]"
                disabled={!isOnline || !deviceId}
                pendingLabel="Claiming..."
              >
                <Play className="h-6 w-6" />
                {controlledByAnother ? "Take game control" : "Claim game control"}
              </RefSubmitButton>
            </form>
          ) : null}

          {hasControl && match.status === "scheduled" ? (
            <form action={updateBasketballLifecycle} onSubmit={prepareCommand}>
              <MatchFields deviceId={deviceId} eventId={eventId} match={match} />
              <input name="command" type="hidden" value="start" />
              <RefSubmitButton
                className="border-emerald-400 bg-emerald-500/20 text-emerald-200"
                disabled={!isOnline || !homeTeam || !awayTeam}
                pendingLabel="Starting..."
              >
                <Play className="h-6 w-6" />
                Start game
              </RefSubmitButton>
            </form>
          ) : null}

          {hasControl && match.status === "live" ? (
            <form
              action={updateBasketballLifecycle}
              onSubmit={(event) => {
                if (!window.confirm("End game and publish the final score?")) {
                  event.preventDefault();
                  return;
                }
                prepareCommand(event);
              }}
            >
              <MatchFields deviceId={deviceId} eventId={eventId} match={match} />
              <input name="command" type="hidden" value="finish" />
              <RefSubmitButton
                className="border-zinc-700 bg-zinc-900 text-zinc-300"
                disabled={!isOnline}
                pendingLabel="Updating..."
              >
                <Flag className="h-5 w-5" />
                End game
              </RefSubmitButton>
            </form>
          ) : null}

          {hasControl ? (
            <form action={updateBasketballLifecycle} onSubmit={prepareCommand}>
              <MatchFields deviceId={deviceId} eventId={eventId} match={match} />
              <input name="command" type="hidden" value="release_control" />
              <RefSubmitButton
                className="min-h-12 border-transparent bg-transparent text-zinc-500"
                disabled={!isOnline}
                pendingLabel="Releasing..."
              >
                Release game control
              </RefSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

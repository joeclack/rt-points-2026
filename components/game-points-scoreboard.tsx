"use client";

import { useEffect, useMemo, useState } from "react";

import { TeamBadge } from "@/components/team-badge";
import type { Team } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";

type GamePointsScoreboardProps = {
  eventId: string;
  eventName: string;
  initialTeams: Team[];
};

type TeamScoreRow = {
  id: string;
  name: string;
  colour: string;
  badge_text: string | null;
  badge_url: string | null;
  game_points_scores: Array<{
    points: number;
  }> | null;
};

function mapTeam(row: TeamScoreRow): Team {
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    badge: row.badge_text ?? row.name.charAt(0).toUpperCase(),
    badgeUrl: row.badge_url,
    points: row.game_points_scores?.at(0)?.points ?? 0,
  };
}

export function GamePointsScoreboard({
  eventId,
  eventName,
  initialTeams,
}: GamePointsScoreboardProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [lastUpdatedTeamId, setLastUpdatedTeamId] = useState<string | null>(null);
  const [, setConnectionState] = useState("Connecting");

  const rankedTeams = useMemo(
    () => [...teams].sort((a, b) => b.points - a.points),
    [teams],
  );
  const podiumOrder = [rankedTeams[1], rankedTeams[0], rankedTeams[2]].filter(
    Boolean,
  );

  useEffect(() => {
    let isMounted = true;
    let refreshTimeout: number | undefined;

    async function refreshTeams(updatedTeamId?: string) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("teams")
          .select("id,name,colour,badge_text,badge_url,game_points_scores(points)")
          .eq("event_id", eventId)
          .order("created_at");

        if (!isMounted || error || !data) {
          return;
        }

        setTeams(data.map((team) => mapTeam(team)));

        if (updatedTeamId) {
          setLastUpdatedTeamId(updatedTeamId);
          window.setTimeout(() => {
            if (isMounted) {
              setLastUpdatedTeamId(null);
            }
          }, 1400);
        }
      } catch {
        if (isMounted) {
          setConnectionState("Offline");
        }
      }
    }

    function queueRefresh(updatedTeamId?: string) {
      if (refreshTimeout) {
        window.clearTimeout(refreshTimeout);
      }

      refreshTimeout = window.setTimeout(() => {
        void refreshTeams(updatedTeamId);
      }, 120);
    }

    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`game-points:${eventId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_points_scores",
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            const updatedTeamId =
              "team_id" in payload.new && typeof payload.new.team_id === "string"
                ? payload.new.team_id
                : undefined;

            queueRefresh(updatedTeamId);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teams",
            filter: `event_id=eq.${eventId}`,
          },
          () => queueRefresh(),
        )
        .subscribe((status) => {
          if (isMounted) {
            setConnectionState(status === "SUBSCRIBED" ? "Live" : "Connecting");
          }
        });

      const fallbackInterval = window.setInterval(() => {
        void refreshTeams();
      }, 5000);

      return () => {
        isMounted = false;

        if (refreshTimeout) {
          window.clearTimeout(refreshTimeout);
        }

        window.clearInterval(fallbackInterval);
        void supabase.removeChannel(channel);
      };
    } catch {
      setConnectionState("Static");
      return undefined;
    }
  }, [eventId]);

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
      <header className="border-b border-white/10 pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
            {eventName}
          </p>
        </div>
      </header>

      <div className="grid flex-1 items-end gap-4 py-8 lg:grid-cols-3">
        {podiumOrder.map((team) => {
          const place = rankedTeams.findIndex((item) => item.id === team.id) + 1;
          const height =
            place === 1
              ? "lg:min-h-[560px]"
              : place === 2
                ? "lg:min-h-[460px]"
                : "lg:min-h-[390px]";
          const responsiveOrder =
            place === 1
              ? "order-1 lg:order-2"
              : place === 2
                ? "order-2 lg:order-1"
                : "order-3 lg:order-3";
          const didUpdate = lastUpdatedTeamId === team.id;

          return (
            <article
              key={team.id}
              className={`flex flex-col justify-between rounded-lg border p-6 shadow-2xl backdrop-blur transition duration-500 ${height} ${responsiveOrder} ${
                didUpdate
                  ? "border-cyan-200 bg-cyan-200/20"
                  : "border-white/15 bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{place}</span>
                <TeamBadge
                  badge={team.badge}
                  badgeUrl={team.badgeUrl}
                  className="h-16 w-16 text-2xl"
                  colour={team.colour}
                  name={team.name}
                />
              </div>
              <div>
                <h2 className="text-5xl font-bold tracking-normal">
                  {team.name}
                </h2>
                <p className="mt-4 text-7xl font-black tracking-normal text-cyan-100">
                  {team.points}
                </p>
              </div>
              <div
                className="h-2 rounded-full"
                style={{ backgroundColor: team.colour }}
              />
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-4">
        {rankedTeams.map((team, index) => (
          <div
            key={team.id}
            className={`flex items-center justify-between rounded-md px-4 py-3 transition duration-500 ${
              lastUpdatedTeamId === team.id ? "bg-cyan-200/20" : "bg-white/10"
            }`}
          >
            <span className="font-semibold">
              {index + 1}. {team.name}
            </span>
            <span className="text-xl font-bold">{team.points}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

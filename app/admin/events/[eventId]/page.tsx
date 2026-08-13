import {
  CalendarDays,
  CircleDot,
  ChevronRight,
  KeyRound,
  MapPin,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { TeamRequestsRealtimeRefresh } from "@/components/team-requests-realtime-refresh";
import { requireAdminUser } from "@/lib/auth";
import { getAdminBasketballTournaments } from "@/lib/basketball";
import { getAdminEventById } from "@/lib/events";
import { getAdminFootballTournaments } from "@/lib/football";
import { getPendingTeamJoinRequests } from "@/lib/team-join-requests";

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const event = await getAdminEventById(eventId, user?.id);
  const [tournaments, joinRequests] = await Promise.all([
    event.sport === "basketball"
      ? getAdminBasketballTournaments(eventId)
      : getAdminFootballTournaments(eventId),
    getPendingTeamJoinRequests(eventId),
  ]);

  const sections = [
    {
      detail: `${joinRequests.length} pending request${joinRequests.length === 1 ? "" : "s"}`,
      href: `/admin/events/${event.id}/teams`,
      icon: UsersRound,
      label: "Teams",
      value: `${event.teams.length}`,
    },
    {
      detail:
        event.sport === "basketball"
          ? "Games and live point scoring"
          : "Fixtures and live match control",
      href: `/admin/events/${event.id}/${event.sport}`,
      icon: event.sport === "basketball" ? CircleDot : ShieldCheck,
      label: event.sport === "basketball" ? "Basketball" : "Football",
      value: `${tournaments.length}`,
    },
    {
      detail: event.viewerAccessCode ? "Code protected" : "Public access",
      href: `/admin/events/${event.id}/access`,
      icon: KeyRound,
      label: "Access",
      value: event.viewerAccessCode ? "On" : "Open",
    },
    {
      detail: "Name, date, location and deletion",
      href: `/admin/events/${event.id}/settings`,
      icon: Settings,
      label: "Settings",
      value: "Manage",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <TeamRequestsRealtimeRefresh eventId={event.id} />
      <header className="mb-6 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="live">
            {event.adminRole === "owner" ? "Owner" : "Shared admin"}
          </StatusPill>
          <StatusPill tone="neutral">{event.visibility}</StatusPill>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">
          {event.name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {event.dateLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {event.location}
          </span>
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <Link
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
                href={section.href}
                key={section.label}
                prefetch={section.label === "Teams" ? false : undefined}
              >
                <Icon className="h-5 w-5 text-slate-500" />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-950">
                    {section.label}
                  </span>
                  <span className="block truncate text-sm text-slate-500">
                    {section.detail}
                  </span>
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {section.value}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

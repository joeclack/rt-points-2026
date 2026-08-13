"use client";

import {
  CalendarDays,
  CircleDot,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

type AdminEventSidebarProps = {
  adminRole?: "owner" | "admin";
  eventId: string;
  eventName: string;
  eventSlug: string;
  sport: "football" | "basketball";
  status: "draft" | "live" | "finished";
};

export function AdminEventSidebar({
  adminRole,
  eventId,
  eventName,
  eventSlug,
  sport,
  status,
}: AdminEventSidebarProps) {
  const pathname = usePathname();
  const items = [
    {
      href: `/admin/events/${eventId}`,
      icon: LayoutDashboard,
      label: "Overview",
    },
    {
      href: `/admin/events/${eventId}/teams`,
      icon: UsersRound,
      label: "Teams",
    },
    sport === "football"
      ? {
          href: `/admin/events/${eventId}/football`,
          icon: ShieldCheck,
          label: "Football",
        }
      : {
          href: `/admin/events/${eventId}/basketball`,
          icon: CircleDot,
          label: "Basketball",
        },
    {
      href: `/admin/events/${eventId}/access`,
      icon: KeyRound,
      label: "Access",
    },
    {
      href: `/admin/events/${eventId}/settings`,
      icon: Settings,
      label: "Settings",
    },
  ];

  function isActive(href: string) {
    return href === `/admin/events/${eventId}`
      ? pathname === href
      : pathname.startsWith(href);
  }

  const itemClass = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    );

  return (
    <aside className="min-w-0">
      <div className="sticky top-6">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3 md:hidden">
          <div className="min-w-0">
            <Link
              className="text-xs font-medium text-slate-500"
              href="/admin/events"
            >
              Tournaments
            </Link>
            <h2 className="truncate text-base font-semibold text-slate-950">
              {eventName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {status !== "finished" ? (
              <Link
                aria-label="Open public page"
                className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                href={`/events/${eventSlug}`}
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
            <form action={logout}>
              <button
                aria-label="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="hidden border-b border-slate-200 pb-5 md:block">
          <Link
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950"
            href="/admin/events"
          >
            <CalendarDays className="h-4 w-4" />
            Tournaments
          </Link>
          <h2 className="mt-4 break-words text-lg font-semibold text-slate-950">
            {eventName}
          </h2>
          <p className="mt-1 text-xs capitalize text-slate-500">
            {status === "finished"
              ? "Archived"
              : adminRole === "owner"
                ? "Owner"
                : "Shared admin"}
          </p>
        </div>

        <nav
          aria-label="Tournament administration"
          className="grid grid-cols-5 gap-1 border-b border-slate-200 pb-3 md:mt-4 md:flex md:flex-col md:overflow-visible md:border-b-0 md:pb-0"
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  itemClass(isActive(item.href)),
                  "min-w-0 flex-col justify-center gap-1 px-1 py-2 text-[0.65rem] md:flex-row md:justify-start md:gap-2 md:px-3 md:text-sm",
                )}
                href={item.href}
                key={item.href}
                prefetch={item.label === "Teams" ? false : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="max-w-full text-center leading-tight md:text-left">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 hidden border-t border-slate-200 pt-4 md:block">
          {status !== "finished" ? (
            <Link
              className={itemClass(false)}
              href={`/events/${eventSlug}`}
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
              Public page
            </Link>
          ) : null}
          <form action={logout}>
            <button className={cn(itemClass(false), "mt-1 w-full")} type="submit">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

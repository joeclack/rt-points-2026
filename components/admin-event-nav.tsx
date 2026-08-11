"use client";

import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Monitor,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

type AdminEventNavProps = {
  eventId?: string;
  eventSlug?: string;
};

export function AdminEventNav({ eventId, eventSlug }: AdminEventNavProps) {
  const pathname = usePathname();
  const navItems = eventId && eventSlug ? [
    {
      href: "/admin/events",
      label: "Tournaments",
      icon: CalendarDays,
      isActive: pathname === "/admin/events",
    },
    {
      href: `/admin/events/${eventId}`,
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: pathname === `/admin/events/${eventId}`,
    },
    {
      href: `/admin/events/${eventId}/football`,
      label: "Football",
      icon: ShieldCheck,
      isActive: pathname === `/admin/events/${eventId}/football`,
    },
    {
      href: `/events/${eventSlug}/football`,
      label: "Public",
      icon: Monitor,
      isActive: pathname.startsWith(`/events/${eventSlug}`),
    },
  ] : [
    {
      href: "/admin/events",
      label: "Tournaments",
      icon: CalendarDays,
      isActive: pathname === "/admin/events",
    },
    {
      href: "/admin/events/new",
      label: "Create",
      icon: PlusCircle,
      isActive: pathname === "/admin/events/new",
    },
  ];

  return (
    <>
      <nav className="mb-6 hidden rounded-md border border-slate-200 bg-white p-1 shadow-sm md:flex">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                item.isActive && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <form action={logout}>
          <button
            className="inline-flex h-full items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            type="submit"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <div
          className={cn(
            "mx-auto grid max-w-md gap-1",
            navItems.length === 2 ? "grid-cols-3" : "grid-cols-5",
          )}
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[0.7rem] font-medium text-slate-500 transition-colors",
                  item.isActive && "bg-slate-950 text-white",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                <span className="text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
          <form action={logout}>
            <button
              className="flex h-full w-full min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[0.7rem] font-medium text-slate-500 transition-colors"
              type="submit"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-center leading-tight">Logout</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}

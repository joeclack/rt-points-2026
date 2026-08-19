import { LogOut, Plus, UsersRound } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function AdminEventNav({ appRole }: { appRole?: "owner" | "admin" }) {
  return (
    <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
      <Link
        className="font-brand text-xl uppercase tracking-wide text-brand-charcoal hover:text-brand-orange-dark"
        href="/admin/events"
      >
        TJG Tournaments
      </Link>

      <div className="flex items-center gap-2">
        {appRole === "owner" ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/admins">
              <UsersRound className="h-4 w-4" />
              Admins
            </Link>
          </Button>
        ) : null}
        <Button asChild size="sm">
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4" />
            New tournament
          </Link>
        </Button>
        <form action={logout}>
          <Button
            aria-label="Log out"
            size="icon"
            title="Log out"
            type="submit"
            variant="ghost"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}

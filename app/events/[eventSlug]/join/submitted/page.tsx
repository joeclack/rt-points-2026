import { CheckCircle2, Monitor, UsersRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getPublicEventShellBySlug } from "@/lib/events";

export default async function TeamSubmittedPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getPublicEventShellBySlug(eventSlug);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-6 py-10">
      <section className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-slate-950">
          Team submitted
        </h1>
        <p className="mt-3 text-slate-600">
          Your team is waiting for a tournament admin to review it.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button asChild>
            <Link href={`/events/${eventSlug}`}>
              <UsersRound className="h-4 w-4" />
              Tournament page
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/events/${eventSlug}/${event.sport}`}>
              <Monitor className="h-4 w-4" />
              Match centre
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

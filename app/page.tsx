import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

import { searchPublicEvents } from "@/lib/events";

export default async function HomePage() {
  const events = await searchPublicEvents();

  return (
    <main className="min-h-screen bg-brand-cream">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-6 border-b border-slate-200 pb-5">
          <p className="font-brand text-lg uppercase leading-none text-brand-orange">
            TJG
          </p>
          <h1 className="mt-1 text-4xl uppercase leading-none text-brand-charcoal sm:text-5xl">
            Tournaments
          </h1>
        </header>

        {events.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {events.map((event) => (
                <Link
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
                  href={`/events/${event.slug}`}
                  key={event.id}
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-slate-950 sm:text-lg">
                      {event.name}
                    </h2>
                    <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                      {event.sport}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {event.dateLabel}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center">
            <p className="font-medium text-slate-800">
              No public tournaments are available yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

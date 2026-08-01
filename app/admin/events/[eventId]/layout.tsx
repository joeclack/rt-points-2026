import type { ReactNode } from "react";

import { AdminEventNav } from "@/components/admin-event-nav";
import { requireAdminUser } from "@/lib/auth";
import { getAdminEventById } from "@/lib/events";

export default async function AdminEventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const user = await requireAdminUser();
  const { eventId } = await params;
  const event = await getAdminEventById(eventId, user?.id, {
    includeTeams: false,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-7xl px-6 pb-24 pt-6 md:py-8">
        <AdminEventNav eventId={event.id} eventSlug={event.slug} />
        {children}
      </section>
    </main>
  );
}

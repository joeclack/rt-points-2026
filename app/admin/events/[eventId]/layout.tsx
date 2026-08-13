import type { ReactNode } from "react";

import { AdminEventSidebar } from "@/components/admin-event-sidebar";
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
  const event = await getAdminEventById(eventId, user?.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 pt-4 sm:px-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 md:py-8">
        <AdminEventSidebar
          adminRole={event.adminRole}
          eventId={event.id}
          eventName={event.name}
          eventSlug={event.slug}
          sport={event.sport}
        />
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

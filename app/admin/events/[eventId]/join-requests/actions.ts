"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSupabaseConfigured, requireAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function teamsAdminPath(eventId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/admin/events/${eventId}/teams?${searchParams.toString()}#requests`;
}

async function reviewRequest(formData: FormData, decision: "accepted" | "rejected") {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const requestId = String(formData.get("request_id") ?? "").trim();

  if (!eventId || !requestId) {
    redirect("/admin/events?error=Missing%20team%20request");
  }

  await requireAdminUser();

  if (!isSupabaseConfigured()) {
    redirect(
      teamsAdminPath(eventId, {
        message:
          decision === "accepted"
            ? "Team accepted and added"
            : "Team request rejected",
      }),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_team_join_request", {
    target_request_id: requestId,
    expected_event_id: eventId,
    decision,
  });

  if (error) {
    redirect(teamsAdminPath(eventId, { error: error.message }));
  }

  const { data: event } = await supabase
    .from("events")
    .select("slug,sport")
    .eq("id", eventId)
    .single();

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/teams`);
  if (event) {
    revalidatePath(`/admin/events/${eventId}/${event.sport}`);
  }
  if (event?.slug) {
    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${event.slug}/${event.sport}`);
  }

  redirect(
    teamsAdminPath(eventId, {
      message:
        decision === "accepted"
          ? "Team accepted and added"
          : "Team request rejected",
    }),
  );
}

export async function acceptTeamJoinRequest(formData: FormData) {
  return reviewRequest(formData, "accepted");
}

export async function rejectTeamJoinRequest(formData: FormData) {
  return reviewRequest(formData, "rejected");
}

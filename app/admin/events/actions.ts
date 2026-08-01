"use server";

import { redirect } from "next/navigation";

import { createSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dateLabel = String(formData.get("date_label") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const gamePointsEnabled = formData.get("game_points_enabled") === "on";
  const footballEnabled = formData.get("football_enabled") === "on";

  if (!name) {
    redirect("/admin/events/new?error=Event%20name%20is%20required");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const slug = createSlug(name);
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      name,
      slug,
      description: description || null,
      date_label: dateLabel || null,
      location: location || null,
      visibility: "public",
      game_points_enabled: gamePointsEnabled,
      football_enabled: footballEnabled,
    })
    .select("id")
    .single();

  if (error || !event) {
    redirect(
      `/admin/events/new?error=${encodeURIComponent(
        error?.message ?? "Unable to create event",
      )}`,
    );
  }

  redirect(`/admin/events/${event.id}`);
}

export async function updateViewerAccessCode(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const accessCode = String(formData.get("access_code") ?? "").trim();

  if (!eventId) {
    redirect("/admin/events?error=Missing%20event");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!accessCode) {
    const { error } = await supabase
      .from("event_viewer_access_codes")
      .delete()
      .eq("event_id", eventId);

    if (error) {
      redirect(
        `/admin/events/${eventId}?error=${encodeURIComponent(error.message)}`,
      );
    }

    redirect(`/admin/events/${eventId}?message=Access%20code%20cleared`);
  }

  const { error } = await supabase.from("event_viewer_access_codes").upsert({
    event_id: eventId,
    access_code: accessCode,
  });

  if (error) {
    redirect(
      `/admin/events/${eventId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/admin/events/${eventId}?message=Access%20code%20saved`);
}

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

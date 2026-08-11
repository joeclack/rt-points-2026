"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const defaultTeamColour = "#14b8a6";

function getText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getEventId(formData: FormData) {
  const eventId = getText(formData, "event_id");

  if (!eventId) {
    redirect("/admin/events");
  }

  return eventId;
}

function getTeamId(formData: FormData) {
  const teamId = getText(formData, "team_id");

  if (!teamId) {
    throw new Error("Team ID is required");
  }

  return teamId;
}

function normalizeColour(colour: string) {
  return /^#[0-9a-f]{6}$/i.test(colour) ? colour : defaultTeamColour;
}

function normalizeBadgeText(text: string, fallbackName: string) {
  const value = text.trim().slice(0, 3).toUpperCase();

  return value || fallbackName.charAt(0).toUpperCase();
}

function normalizeBadgeUrl(url: string) {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol)
      ? parsedUrl.toString()
      : null;
  } catch {
    return null;
  }
}

function adminPath(eventId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/admin/events/${eventId}/football?${searchParams.toString()}`;
}

async function getEventSlug(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .single();

  return data?.slug;
}

async function revalidateEventPages(eventId: string) {
  const slug = await getEventSlug(eventId);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/football`);

  if (slug) {
    revalidatePath(`/events/${slug}`);
    revalidatePath(`/events/${slug}/football`);
  }
}

export async function createTeam(formData: FormData) {
  const eventId = getEventId(formData);
  const name = getText(formData, "name");
  const colour = normalizeColour(getText(formData, "colour"));
  const badgeText = normalizeBadgeText(getText(formData, "badge_text"), name);
  const badgeUrl = normalizeBadgeUrl(getText(formData, "badge_url"));

  if (!name) {
    redirect(adminPath(eventId, { error: "Team name is required" }));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    event_id: eventId,
    name,
    colour,
    badge_text: badgeText,
    badge_url: badgeUrl,
  });

  if (error) {
    redirect(adminPath(eventId, { error: error.message }));
  }

  await revalidateEventPages(eventId);
  redirect(adminPath(eventId, { message: "Team created" }));
}

export async function updateTeam(formData: FormData) {
  const eventId = getEventId(formData);
  const teamId = getTeamId(formData);
  const name = getText(formData, "name");
  const colour = normalizeColour(getText(formData, "colour"));
  const badgeText = normalizeBadgeText(getText(formData, "badge_text"), name);
  const badgeUrl = normalizeBadgeUrl(getText(formData, "badge_url"));

  if (!name) {
    redirect(adminPath(eventId, { error: "Team name is required" }));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name,
      colour,
      badge_text: badgeText,
      badge_url: badgeUrl,
    })
    .eq("id", teamId)
    .eq("event_id", eventId);

  if (error) {
    redirect(adminPath(eventId, { error: error.message }));
  }

  await revalidateEventPages(eventId);
  redirect(adminPath(eventId, { message: "Team updated" }));
}

export async function deleteTeam(formData: FormData) {
  const eventId = getEventId(formData);
  const teamId = getTeamId(formData);
  const confirm = getText(formData, "confirm");

  if (confirm !== "DELETE") {
    redirect(adminPath(eventId, { error: "Type DELETE to remove a team" }));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("event_id", eventId);

  if (error) {
    redirect(adminPath(eventId, { error: error.message }));
  }

  await revalidateEventPages(eventId);
  redirect(adminPath(eventId, { message: "Team deleted" }));
}

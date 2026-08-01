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
  return `/admin/events/${eventId}/game-points?${searchParams.toString()}`;
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
  revalidatePath(`/admin/events/${eventId}/game-points`);

  if (slug) {
    revalidatePath(`/events/${slug}`);
    revalidatePath(`/events/${slug}/game-points`);
  }
}

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user.id;
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

export async function adjustTeamScore(formData: FormData) {
  const eventId = getEventId(formData);
  const teamId = getTeamId(formData);
  const delta = Number(getText(formData, "delta"));

  if (!Number.isFinite(delta)) {
    redirect(adminPath(eventId, { error: "Score change is invalid" }));
  }

  await updateScore(eventId, teamId, "adjust", delta);
}

export async function setTeamScore(formData: FormData) {
  const eventId = getEventId(formData);
  const teamId = getTeamId(formData);
  const points = Number(getText(formData, "points"));

  if (!Number.isInteger(points) || points < 0) {
    redirect(adminPath(eventId, { error: "Score must be zero or higher" }));
  }

  await updateScore(eventId, teamId, "set", points);
}

export async function resetScores(formData: FormData) {
  const eventId = getEventId(formData);
  const confirm = getText(formData, "confirm");

  if (confirm !== "RESET") {
    redirect(adminPath(eventId, { error: "Type RESET to reset all scores" }));
  }

  const actorId = await getUserId();
  const supabase = await createClient();
  const { data: scores, error: scoreError } = await supabase
    .from("game_points_scores")
    .select("team_id,points")
    .eq("event_id", eventId);

  if (scoreError) {
    redirect(adminPath(eventId, { error: scoreError.message }));
  }

  const { error } = await supabase
    .from("game_points_scores")
    .update({ points: 0 })
    .eq("event_id", eventId);

  if (error) {
    redirect(adminPath(eventId, { error: error.message }));
  }

  const auditRows = (scores ?? [])
    .filter((score) => score.points !== 0)
    .map((score) => ({
      event_id: eventId,
      team_id: score.team_id,
      actor_id: actorId,
      points_delta: -score.points,
      points_after: 0,
      reason: "Reset all scores",
    }));

  if (auditRows.length > 0) {
    await supabase.from("score_events").insert(auditRows);
  }

  await revalidateEventPages(eventId);
  redirect(adminPath(eventId, { message: "Scores reset" }));
}

async function updateScore(
  eventId: string,
  teamId: string,
  mode: "adjust" | "set",
  value: number,
) {
  const actorId = await getUserId();
  const supabase = await createClient();
  const { data: currentScore, error: readError } = await supabase
    .from("game_points_scores")
    .select("points")
    .eq("event_id", eventId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (readError) {
    redirect(adminPath(eventId, { error: readError.message }));
  }

  const currentPoints = currentScore?.points ?? 0;
  const nextPoints = mode === "adjust" ? Math.max(0, currentPoints + value) : value;
  const pointsDelta = nextPoints - currentPoints;

  const { error: writeError } = await supabase
    .from("game_points_scores")
    .upsert({
      event_id: eventId,
      team_id: teamId,
      points: nextPoints,
    });

  if (writeError) {
    redirect(adminPath(eventId, { error: writeError.message }));
  }

  const { error: auditError } = await supabase.from("score_events").insert({
    event_id: eventId,
    team_id: teamId,
    actor_id: actorId,
    points_delta: pointsDelta,
    points_after: nextPoints,
    reason: mode === "adjust" ? "Quick score change" : "Set exact score",
  });

  if (auditError) {
    redirect(adminPath(eventId, { error: auditError.message }));
  }

  await revalidateEventPages(eventId);
  redirect(adminPath(eventId, { message: "Score updated" }));
}

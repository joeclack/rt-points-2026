"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { containsProfanity } from "@/lib/profanity";
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
  return `/admin/events/${eventId}/teams?${searchParams.toString()}`;
}

async function getEvent(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("slug,sport")
    .eq("id", eventId)
    .single();

  return data;
}

async function revalidateEventPages(eventId: string) {
  const event = await getEvent(eventId);

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/teams`);
  if (event) {
    revalidatePath(`/admin/events/${eventId}/${event.sport}`);
  }

  if (event?.slug) {
    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/events/${event.slug}/${event.sport}`);
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
  const playerSlots = formData
    .getAll("player_slot")
    .map((slot) => Number(slot));
  const existingPlayers = playerSlots.map((slot) => ({
    slot,
    name: getText(formData, `player_${slot}_name`),
  }));
  const newPlayerSlots = formData
    .getAll("new_player_slot")
    .map((slot) => Number(slot));
  const newPlayers = newPlayerSlots.map((slot) => ({
    slot,
    name: getText(formData, `new_player_${slot}_name`),
  }));
  const shouldCreateRoster = newPlayers.some((player) => player.name);
  const players = existingPlayers.length
    ? existingPlayers
    : shouldCreateRoster
      ? newPlayers
      : [];

  if (!name) {
    redirect(adminPath(eventId, { error: "Team name is required" }));
  }

  if (containsProfanity(name)) {
    redirect(
      adminPath(eventId, {
        error: "Team name contains language that is not allowed",
      }),
    );
  }

  if (
    players.some(
      (player) =>
        !Number.isInteger(player.slot) ||
        player.slot < 1 ||
        player.slot > 20 ||
        player.name.length < 2 ||
        player.name.length > 80,
    )
  ) {
    redirect(
      adminPath(eventId, {
        error: "Every player name must be between 2 and 80 characters",
      }),
    );
  }

  if (players.some((player) => containsProfanity(player.name))) {
    redirect(
      adminPath(eventId, {
        error: "A player name contains language that is not allowed",
      }),
    );
  }

  if (
    new Set(players.map((player) => player.name.toLowerCase())).size !==
    players.length
  ) {
    redirect(adminPath(eventId, { error: "Enter different player names" }));
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

  if (players.length) {
    const { error: rosterError } = await supabase.rpc("update_team_roster", {
      p_event_id: eventId,
      p_team_id: teamId,
      p_players: players,
    });

    if (rosterError) {
      redirect(adminPath(eventId, { error: rosterError.message }));
    }
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
  const [{ data: footballMatches }, { data: basketballMatches }] =
    await Promise.all([
      supabase
        .from("football_matches")
        .select("id")
        .eq("event_id", eventId)
        .or(
          `home_team_id.eq.${teamId},away_team_id.eq.${teamId},winner_team_id.eq.${teamId}`,
        )
        .limit(1),
      supabase
        .from("basketball_matches")
        .select("id")
        .eq("event_id", eventId)
        .or(
          `home_team_id.eq.${teamId},away_team_id.eq.${teamId},winner_team_id.eq.${teamId}`,
        )
        .limit(1),
    ]);

  if (footballMatches?.length || basketballMatches?.length) {
    redirect(
      adminPath(eventId, {
        error: "This team cannot be deleted because it is in use by a tournament fixture",
      }),
    );
  }

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("event_id", eventId);

  if (error) {
    redirect(
      adminPath(eventId, {
        error:
          error.code === "23503"
            ? "This team cannot be deleted because it is in use by a tournament fixture"
            : error.message,
      }),
    );
  }

  await revalidateEventPages(eventId);
  redirect(adminPath(eventId, { message: "Team deleted" }));
}

"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/auth";
import { containsProfanity } from "@/lib/profanity";
import { createClient } from "@/lib/supabase/server";
import { getViewerAccessCode } from "@/lib/viewer-access";

function tournamentPath(slug: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/events/${slug}/join?${searchParams.toString()}`;
}

function fail(slug: string, message: string): never {
  redirect(tournamentPath(slug, { join_error: message }));
}

function submittedPath(slug: string) {
  return `/events/${slug}/join/submitted`;
}

export async function submitTeamJoinRequest(formData: FormData) {
  const eventSlug = String(formData.get("event_slug") ?? "").trim();
  const teamName = String(formData.get("team_name") ?? "").trim();
  const teamColour = String(formData.get("team_colour") ?? "").trim();
  const requestedTeamSize = Number(formData.get("team_size"));
  const teamSize =
    Number.isInteger(requestedTeamSize) &&
    requestedTeamSize >= 2 &&
    requestedTeamSize <= 20
      ? requestedTeamSize
      : 5;
  const playerNames = Array.from({ length: teamSize }, (_, index) =>
    String(formData.get(`player_${index + 1}`) ?? "").trim(),
  );

  if (!eventSlug) {
    redirect("/");
  }

  if (teamName.length < 2 || teamName.length > 60) {
    fail(eventSlug, "Team name must be between 2 and 60 characters");
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(teamColour)) {
    fail(eventSlug, "Choose a valid team colour");
  }

  if (playerNames.some((name) => name.length < 2 || name.length > 80)) {
    fail(eventSlug, `Enter all ${teamSize} player names`);
  }

  if (
    new Set(playerNames.map((name) => name.toLowerCase())).size !== teamSize
  ) {
    fail(eventSlug, `Enter ${teamSize} different player names`);
  }

  if (containsProfanity(teamName)) {
    fail(eventSlug, "Team name contains language that is not allowed");
  }

  if (playerNames.some((name) => containsProfanity(name))) {
    fail(eventSlug, "A player name contains language that is not allowed");
  }

  if (!isSupabaseConfigured()) {
    redirect(submittedPath(eventSlug));
  }

  const accessCode = await getViewerAccessCode(eventSlug);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_team_join_request", {
    event_slug: eventSlug,
    submitted_code: accessCode,
    submitted_team_name: teamName,
    submitted_team_colour: teamColour,
    submitted_player_names: playerNames,
  });

  if (error) {
    fail(eventSlug, error.message);
  }

  redirect(submittedPath(eventSlug));
}

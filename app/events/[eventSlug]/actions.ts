"use server";

import { redirect } from "next/navigation";

import { verifyViewerAccess } from "@/lib/events";
import { rememberViewerAccessCode } from "@/lib/viewer-access";

export async function submitViewerAccessCode(formData: FormData) {
  const eventSlug = String(formData.get("event_slug") ?? "");
  const fallbackPath = `/events/${eventSlug}`;
  const requestedNextPath = String(formData.get("next") ?? fallbackPath);
  const nextPath = requestedNextPath.startsWith(fallbackPath)
    ? requestedNextPath
    : fallbackPath;
  const accessCode = String(formData.get("access_code") ?? "").trim();

  if (!eventSlug || !accessCode) {
    redirect(`${nextPath}?error=Enter%20access%20code`);
  }

  const hasAccess = await verifyViewerAccess(eventSlug, accessCode);

  if (!hasAccess) {
    redirect(`${nextPath}?error=Invalid%20access%20code`);
  }

  await rememberViewerAccessCode(eventSlug, accessCode);
  redirect(nextPath);
}

import { cookies } from "next/headers";

const cookiePrefix = "rt-points.viewer-access.";

export async function getViewerAccessCode(eventSlug: string) {
  const cookieStore = await cookies();

  return cookieStore.get(`${cookiePrefix}${eventSlug}`)?.value ?? "";
}

export async function rememberViewerAccessCode(
  eventSlug: string,
  accessCode: string,
) {
  const cookieStore = await cookies();

  cookieStore.set(`${cookiePrefix}${eventSlug}`, accessCode, {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: `/events/${eventSlug}`,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

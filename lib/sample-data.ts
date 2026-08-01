export type Team = {
  id: string;
  name: string;
  colour: string;
  badge: string;
  badgeUrl?: string | null;
  points: number;
};

export type EventSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  dateLabel: string;
  location: string;
  visibility: "public" | "private";
  trackers: Array<"game-points" | "football">;
  teams: Team[];
  viewerAccessCode?: string | null;
  adminRole?: "owner" | "admin";
};

export const sampleTeams: Team[] = [
  {
    id: "zion",
    name: "Zion",
    colour: "#14b8a6",
    badge: "Z",
    points: 42,
  },
  {
    id: "eden",
    name: "Eden",
    colour: "#f59e0b",
    badge: "E",
    points: 36,
  },
  {
    id: "judah",
    name: "Judah",
    colour: "#ef4444",
    badge: "J",
    points: 31,
  },
  {
    id: "bethel",
    name: "Bethel",
    colour: "#6366f1",
    badge: "B",
    points: 27,
  },
];

export const sampleEvents: EventSummary[] = [
  {
    id: "evt_jesus_generation",
    slug: "the-jesus-generation",
    name: "The Jesus Generation",
    description:
      "A live event with team games now and football match tracking planned for the same event.",
    dateLabel: "Summer 2026",
    location: "Main auditorium",
    visibility: "public",
    trackers: ["game-points", "football"],
    teams: sampleTeams,
  },
  {
    id: "evt_glow_games",
    slug: "glow-games",
    name: "Glow Games",
    description:
      "A public points tracker for house-style team games and live audience standings.",
    dateLabel: "Demo event",
    location: "Projector display",
    visibility: "public",
    trackers: ["game-points"],
    teams: sampleTeams.slice(0, 3),
  },
];

export const selectedEvent = sampleEvents[0];

export const rankedTeams = [...selectedEvent.teams].sort(
  (a, b) => b.points - a.points,
);

export function getEventBySlug(slug: string) {
  return sampleEvents.find((event) => event.slug === slug) ?? selectedEvent;
}

export function getEventById(id: string) {
  return sampleEvents.find((event) => event.id === id) ?? selectedEvent;
}

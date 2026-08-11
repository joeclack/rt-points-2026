export type Team = {
  id: string;
  name: string;
  colour: string;
  badge: string;
  badgeUrl?: string | null;
};

export type EventSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  dateLabel: string;
  location: string;
  visibility: "public" | "private";
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
  },
  {
    id: "eden",
    name: "Eden",
    colour: "#f59e0b",
    badge: "E",
  },
  {
    id: "judah",
    name: "Judah",
    colour: "#ef4444",
    badge: "J",
  },
  {
    id: "bethel",
    name: "Bethel",
    colour: "#6366f1",
    badge: "B",
  },
];

export const sampleEvents: EventSummary[] = [
  {
    id: "evt_jesus_generation",
    slug: "the-jesus-generation",
    name: "The Jesus Generation",
    description:
      "A live football event with tournaments, fixtures, scores and match tracking in one place.",
    dateLabel: "Summer 2026",
    location: "Main auditorium",
    visibility: "public",
    teams: sampleTeams,
  },
  {
    id: "evt_summer_cup",
    slug: "summer-cup",
    name: "Summer Cup",
    description:
      "A demo football tournament with live fixtures, results and standings.",
    dateLabel: "Demo event",
    location: "Main pitch",
    visibility: "public",
    teams: sampleTeams.slice(0, 3),
  },
];

export const selectedEvent = sampleEvents[0];

export function getEventBySlug(slug: string) {
  return sampleEvents.find((event) => event.slug === slug) ?? selectedEvent;
}

export function getEventById(id: string) {
  return sampleEvents.find((event) => event.id === id) ?? selectedEvent;
}

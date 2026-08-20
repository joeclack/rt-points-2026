export type Team = {
  id: string;
  name: string;
  colour: string;
  badge: string;
  badgeUrl?: string | null;
  players: Array<{
    slot: number;
    name: string;
  }>;
};

export type EventSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  dateLabel: string;
  location: string;
  visibility: "public" | "private";
  teamSize: number;
  teamSignupsEnabled: boolean;
  footballMatchMinutes: number;
  sport: "football" | "basketball";
  status: "draft" | "live" | "finished";
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
    players: [
      { slot: 1, name: "Alex" },
      { slot: 2, name: "Jordan" },
      { slot: 3, name: "Casey" },
      { slot: 4, name: "Morgan" },
      { slot: 5, name: "Taylor" },
    ],
  },
  {
    id: "eden",
    name: "Eden",
    colour: "#f59e0b",
    badge: "E",
    players: [
      { slot: 1, name: "Jamie" },
      { slot: 2, name: "Sam" },
      { slot: 3, name: "Riley" },
      { slot: 4, name: "Cameron" },
      { slot: 5, name: "Drew" },
    ],
  },
  {
    id: "judah",
    name: "Judah",
    colour: "#ef4444",
    badge: "J",
    players: [
      { slot: 1, name: "Avery" },
      { slot: 2, name: "Quinn" },
      { slot: 3, name: "Parker" },
      { slot: 4, name: "Reese" },
      { slot: 5, name: "Rowan" },
    ],
  },
  {
    id: "bethel",
    name: "Bethel",
    colour: "#6366f1",
    badge: "B",
    players: [
      { slot: 1, name: "Devon" },
      { slot: 2, name: "Ellis" },
      { slot: 3, name: "Hayden" },
      { slot: 4, name: "Finley" },
      { slot: 5, name: "Blair" },
    ],
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
    teamSize: 5,
    teamSignupsEnabled: true,
    footballMatchMinutes: 20,
    sport: "football",
    status: "live",
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
    teamSize: 5,
    teamSignupsEnabled: true,
    footballMatchMinutes: 20,
    sport: "football",
    status: "live",
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

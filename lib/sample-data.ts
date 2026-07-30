export type Team = {
  id: string;
  name: string;
  colour: string;
  badge: string;
  points: number;
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

export const rankedTeams = [...sampleTeams].sort((a, b) => b.points - a.points);

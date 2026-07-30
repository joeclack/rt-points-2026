import { getPublicEventBySlug } from "@/lib/events";

export default async function EventGamePointsPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getPublicEventBySlug(eventSlug);
  const rankedTeams = [...event.teams].sort((a, b) => b.points - a.points);
  const podiumOrder = [rankedTeams[1], rankedTeams[0], rankedTeams[2]].filter(
    Boolean,
  );

  return (
    <main className="display-surface min-h-screen overflow-hidden text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {event.name}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-normal">
              Game Points
            </h1>
          </div>
          <div className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
            Public live display
          </div>
        </header>

        <div className="grid flex-1 items-end gap-4 py-8 lg:grid-cols-3">
          {podiumOrder.map((team) => {
            const place = rankedTeams.findIndex((item) => item.id === team.id) + 1;
            const height =
              place === 1
                ? "lg:min-h-[560px]"
                : place === 2
                  ? "lg:min-h-[460px]"
                  : "lg:min-h-[390px]";

            return (
              <article
                key={team.id}
                className={`flex flex-col justify-between rounded-lg border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur ${height}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{place}</span>
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-md text-2xl font-bold text-white"
                    style={{ backgroundColor: team.colour }}
                  >
                    {team.badge}
                  </div>
                </div>
                <div>
                  <h2 className="text-5xl font-bold tracking-normal">
                    {team.name}
                  </h2>
                  <p className="mt-4 text-7xl font-black tracking-normal text-cyan-100">
                    {team.points}
                  </p>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: team.colour }}
                />
              </article>
            );
          })}
        </div>

        <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-4">
          {rankedTeams.map((team, index) => (
            <div
              key={team.id}
              className="flex items-center justify-between rounded-md bg-white/10 px-4 py-3"
            >
              <span className="font-semibold">
                {index + 1}. {team.name}
              </span>
              <span className="text-xl font-bold">{team.points}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

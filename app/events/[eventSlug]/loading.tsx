export default function PublicTournamentLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="h-12 w-full max-w-xl animate-pulse rounded-md bg-slate-200" />

      <div className="mt-8 space-y-4">
        <div className="h-48 animate-pulse rounded-md border border-slate-200 bg-white" />
        <div className="h-80 animate-pulse rounded-md border border-slate-200 bg-white" />
      </div>
    </main>
  );
}

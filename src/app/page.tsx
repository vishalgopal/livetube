const platformPillars = [
  "Multi-channel operations",
  "Media library on VPS storage",
  "AI metadata workflows",
  "Playlist and stream scheduling",
  "YouTube publishing and moderation",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f9d9a7,transparent_30%),linear-gradient(180deg,#fff9ef_0%,#f4ede1_100%)] text-stone-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16 md:px-10">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-800">
            Livetube Control Room
          </p>
          <div className="max-w-4xl space-y-4">
            <h1 className="text-5xl font-semibold tracking-tight text-stone-950 md:text-7xl">
              One dashboard for uploads, playlists, streams, and channel ops.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-700 md:text-xl">
              The initial scaffold is in place. Next steps are auth, channel
              connection flows, media ingestion, and background jobs.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {platformPillars.map((pillar) => (
            <article
              key={pillar}
              className="rounded-3xl border border-stone-200/70 bg-white/75 p-5 shadow-[0_18px_60px_rgba(120,83,27,0.08)] backdrop-blur"
            >
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
                Pillar
              </p>
              <h2 className="mt-3 text-lg font-semibold text-stone-900">
                {pillar}
              </h2>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

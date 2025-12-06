export default function Loading() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-24 bg-white text-gray-900">
      <div className="space-y-2">
        <div className="h-10 w-40 rounded-lg bg-gradient-to-r from-sky-400/50 via-cyan-400/50 to-sky-400/50 animate-pulse" />
        <div className="h-4 w-56 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl border border-gray-200 bg-gray-100 animate-pulse"
            style={{ animationDelay: `${i * 0.06}s` }}
          />
        ))}
        <div className="h-10 w-32 rounded-lg bg-gradient-to-r from-sky-500/40 to-cyan-500/40 animate-pulse" />
      </div>
    </main>
  );
}


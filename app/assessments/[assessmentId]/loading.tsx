export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 bg-background text-foreground">
      <div className="space-y-4">
        <div className="h-8 w-64 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded bg-muted/40 animate-pulse" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card/70 p-5 space-y-3 animate-pulse"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="h-4 w-40 rounded bg-muted/50" />
              <div className="h-3 w-full rounded bg-muted/40" />
              <div className="h-3 w-5/6 rounded bg-muted/40" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="h-24 rounded-xl border border-border bg-card/70 animate-pulse" />
          <div className="h-24 rounded-xl border border-border bg-card/70 animate-pulse" />
        </div>
      </div>
    </main>
  );
}


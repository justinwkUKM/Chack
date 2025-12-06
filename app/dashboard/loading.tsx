export default function Loading() {
  return (
    <div className="flex h-screen bg-background text-foreground pt-16">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 animate-pulse" />

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
              <div className="h-8 w-64 rounded bg-muted/60 animate-pulse" />
              <div className="h-4 w-96 max-w-full rounded bg-muted/40 animate-pulse" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-border bg-card/60 animate-pulse"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-6 space-y-4 animate-pulse">
              <div className="h-4 w-32 rounded bg-muted/50" />
              <div className="h-3 w-full rounded bg-muted/40" />
              <div className="h-3 w-5/6 rounded bg-muted/40" />
              <div className="h-3 w-2/3 rounded bg-muted/40" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


export default function Loading() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground pt-16">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 animate-pulse" />

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-muted/60 animate-pulse" />
            <div className="h-4 w-80 max-w-full rounded bg-muted/40 animate-pulse" />
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card/70 p-5 space-y-3 animate-pulse"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="h-4 w-28 rounded bg-muted/50" />
                <div className="h-3 w-full rounded bg-muted/40" />
                <div className="h-3 w-2/3 rounded bg-muted/40" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


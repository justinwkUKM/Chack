export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 pt-20 bg-background text-foreground">
      <div className="space-y-4">
        <div className="h-8 w-72 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-96 max-w-full rounded bg-muted/40 animate-pulse" />
      </div>

      <div className="mt-8 space-y-4">
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
    </main>
  );
}


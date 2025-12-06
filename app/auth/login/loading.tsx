"use client";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 bg-background text-foreground">
      <div className="text-center space-y-3">
        <div className="h-10 w-72 max-w-full mx-auto rounded-lg bg-gradient-to-r from-sky-400/40 via-cyan-400/40 to-sky-400/40 animate-pulse" />
        <div className="h-4 w-64 max-w-full mx-auto rounded bg-muted/60 animate-pulse" />
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl border border-border bg-card/70 shadow-sm animate-pulse"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </main>
  );
}


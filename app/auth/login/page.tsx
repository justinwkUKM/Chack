// app/auth/login/page.tsx

"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Sign in to Pentest Platform</h1>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="rounded bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-100"
        >
          Continue with Google
        </button>

        <button
          onClick={() => signIn("github", { callbackUrl })}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Continue with GitHub
        </button>
      </div>
    </main>
  );
}


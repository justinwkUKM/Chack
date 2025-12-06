// components/sign-out-button.tsx

"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded bg-slate-800 px-3 py-1 text-sm text-slate-100 hover:bg-slate-700"
    >
      Sign out
    </button>
  );
}


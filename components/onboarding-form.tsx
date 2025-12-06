// components/onboarding-form.tsx

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");

  const createOrg = useMutation(api.onboarding.createOrganization);
  const joinOrg = useMutation(api.onboarding.joinOrganization);

  const handleCreate = async () => {
    if (!orgName.trim()) return;

    const orgId = await createOrg({ name: orgName, userId });
    await joinOrg({ orgId, userId, role: "owner" });
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6 animate-scale-in">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-4">
        <h2 className="font-display font-semibold text-xl text-black">Create your own organization</h2>
        <input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Acme Security"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 font-display"
          onKeyDown={(e) => {
            if (e.key === "Enter" && orgName.trim()) {
              handleCreate();
            }
          }}
        />
        <button
          disabled={!orgName.trim()}
          onClick={handleCreate}
          className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
        >
          Create & Continue
        </button>
      </div>
    </div>
  );
}


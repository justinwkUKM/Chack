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
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold">Create your own organization</h2>
        <input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Acme Security"
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && orgName.trim()) {
              handleCreate();
            }
          }}
        />
        <button
          disabled={!orgName.trim()}
          onClick={handleCreate}
          className="mt-3 w-full rounded bg-sky-500 px-3 py-2 font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create & Continue
        </button>
      </div>
    </div>
  );
}


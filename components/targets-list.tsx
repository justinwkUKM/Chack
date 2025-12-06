// components/targets-list.tsx

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";

const ORG_ID = "demo-org"; // TODO: replace with real org selection later

export default function TargetsList() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const targets = useQuery(api.targets.list, { orgId: ORG_ID }) ?? [];
  const createTarget = useMutation(api.targets.create);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    await createTarget({
      orgId: ORG_ID,
      createdByUserId: session.user.id,
      name: name || url,
      mode: "blackbox",
      type: "web_app",
      primaryIdentifier: url,
    });

    setName("");
    setUrl("");
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Targets</h2>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Target name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <input
          type="url"
          placeholder="https://app.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-[2] rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {targets.length === 0 ? (
          <li className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400">
            No targets yet. Add your first target above.
          </li>
        ) : (
          targets.map((target) => (
            <li
              key={target._id}
              className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{target.name}</div>
                <div className="text-xs text-slate-400">
                  {target.primaryIdentifier}
                </div>
              </div>
              <span className="rounded bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                {target.mode}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

// components/settings-content.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";
import { useToast } from "./toast";

interface SettingsContentProps {
  userId: string;
  orgId: string;
}

export default function SettingsContent({
  userId,
  orgId,
}: SettingsContentProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "organization" | "plans" | "credits">(
    "profile"
  );

  const user = useQuery(api.users.getById, { userId });
  const org = useQuery(api.organizations.get, { orgId });
  const creditHistory = useQuery(api.credits.getHistory, { orgId, limit: 20 });

  const updateUserName = useMutation(api.users.updateName);
  const updateOrgName = useMutation(api.organizations.updateName);
  const updatePlan = useMutation(api.organizations.updatePlan);

  const { showToast, ToastComponent } = useToast();

  const [userName, setUserName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize form values from database when data loads
  useEffect(() => {
    if (user) {
      setUserName(user.name || "");
    }
  }, [user]);
  
  useEffect(() => {
    if (org) {
      setOrgName('name' in org ? org.name || "" : "");
    }
  }, [org]);

  const handleUpdateUserName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setSaving(true);
    try {
      await updateUserName({ userId, name: userName.trim() });
      // Show success notification
      showToast("Name updated successfully in database!", "success");
      // The UI will automatically update via Convex reactive query
    } catch (error) {
      console.error(error);
      showToast("Failed to update name. Please try again.", "error");
      // Reset to current value on error
      if (user) {
        setUserName(user.name || "");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      await updateOrgName({ orgId, name: orgName.trim() });
      // Show success notification
      showToast("Organization name updated successfully in database!", "success");
      // The UI will automatically update via Convex reactive query
    } catch (error) {
      console.error(error);
      showToast("Failed to update organization name. Please try again.", "error");
      // Reset to current value on error
      if (org) {
        setOrgName('name' in org ? org.name || "" : "");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePlanChange = async (newPlan: string) => {
    if (newPlan === "enterprise") {
      if (
        !confirm(
          "To upgrade to Enterprise plan, please contact the development team. Continue?"
        )
      ) {
        return;
      }
      // In a real app, this would open a contact form or email
      alert(
        "Please contact the development team at support@pentestplatform.com for Enterprise plan pricing."
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${newPlan === "pro" ? "upgrade" : "downgrade"} to ${newPlan} plan?`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await updatePlan({ orgId, plan: newPlan, userId });
      alert(`Plan updated to ${newPlan} successfully!`);
    } catch (error) {
      alert("Failed to update plan");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getPlanCredits = (plan: string) => {
    switch (plan) {
      case "free":
        return 10;
      case "pro":
        return 1000;
      case "enterprise":
        return "Contact for pricing";
      default:
        return 0;
    }
  };

  if (user === undefined || org === undefined) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-700 font-display">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {ToastComponent}
      <div className="space-y-6 animate-fade-in">
        {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: "profile", label: "Profile" },
            { id: "organization", label: "Organization" },
            { id: "plans", label: "Plans" },
            { id: "credits", label: "Credit History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-300 font-display ${
                activeTab === tab.id
                  ? "border-sky-500"
                  : "border-transparent text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-6">
          <div>
            <h2 className="text-xl font-display font-semibold mb-6 text-black">Profile Information</h2>
            <form onSubmit={handleUpdateUserName} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Email cannot be changed (managed by OAuth provider)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Provider
                </label>
                <input
                  type="text"
                  value={user?.provider === "google" ? "Google" : "GitHub"}
                  disabled
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !userName.trim()}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === "organization" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-6">
          <div>
            <h2 className="text-xl font-display font-semibold mb-6 text-black">Organization Settings</h2>
            <form onSubmit={handleUpdateOrgName} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300"
                  placeholder="Organization name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Organization Slug
                </label>
                <input
                  type="text"
                  value={org && 'slug' in org ? org.slug : ""}
                  disabled
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Slug is auto-generated from organization name
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Current Plan
                </label>
                <input
                  type="text"
                  value={org && 'plan' in org ? org.plan.toUpperCase() : ""}
                  disabled
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Change plan in the Plans tab
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2 font-display">
                  Available Credits
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={org && 'credits' in org ? org.credits ?? 0 : 0}
                    disabled
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                  />
                  {org && 'credits' in org && org.credits !== undefined && org.credits < 3 && (
                    <span className="text-xs text-yellow-700 font-medium">
                      Low credits!
                    </span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving || !orgName.trim()}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/90 p-8 shadow-lg shadow-black/5 dark:shadow-black/25 backdrop-blur">
            <h2 className="text-xl font-display font-semibold mb-6 text-foreground">Choose Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free Plan */}
              <div
                className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  org && 'plan' in org && org.plan === "free"
                    ? "border-primary/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-primary/5"
                    : "border-border bg-card/70 hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-display font-semibold text-foreground">Free</h3>
                  {org && 'plan' in org && org.plan === "free" && (
                    <span className="text-xs bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-3 py-1 rounded-full font-medium animate-pulse-slow">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-3xl font-display font-bold mb-4 text-foreground">$0</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ 10 credits included</li>
                  <li>✓ Basic features</li>
                  <li>✓ Community support</li>
                </ul>
                {org && 'plan' in org && org.plan !== "free" && (
                  <button
                    onClick={() => handlePlanChange("free")}
                    disabled={saving}
                    className="w-full rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 hover:scale-105 transition-all duration-300 font-display border border-border"
                  >
                    Downgrade
                  </button>
                )}
              </div>

              {/* Pro Plan */}
              <div
                className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  org && 'plan' in org && org.plan === "pro"
                    ? "border-primary/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-primary/5"
                    : "border-border bg-card/70 hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-display font-semibold text-foreground">Pro</h3>
                  {org && 'plan' in org && org.plan === "pro" && (
                    <span className="text-xs bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-3 py-1 rounded-full font-medium animate-pulse-slow">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-3xl font-display font-bold mb-4 text-foreground">$99/mo</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ 1000 credits included</li>
                  <li>✓ All features</li>
                  <li>✓ Priority support</li>
                  <li>✓ Advanced analytics</li>
                </ul>
                {org && 'plan' in org && org.plan !== "pro" && (
                  <button
                    onClick={() => handlePlanChange("pro")}
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
                  >
                    {org && 'plan' in org && org.plan === "free" ? "Upgrade" : "Switch"}
                  </button>
                )}
              </div>

              {/* Enterprise Plan */}
              <div
                className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  org && 'plan' in org && org.plan === "enterprise"
                    ? "border-primary/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-primary/5"
                    : "border-border bg-card/70 hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-display font-semibold text-foreground">Enterprise</h3>
                  {org && 'plan' in org && org.plan === "enterprise" && (
                    <span className="text-xs bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-3 py-1 rounded-full font-medium animate-pulse-slow">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-3xl font-display font-bold mb-4 text-foreground">Custom</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Contact for pricing</li>
                  <li>✓ Unlimited credits</li>
                  <li>✓ Custom features</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ SLA guarantee</li>
                </ul>
                {org && 'plan' in org && org.plan !== "enterprise" && (
                  <button
                    onClick={() => handlePlanChange("enterprise")}
                    disabled={saving}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
                  >
                    Contact Sales
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit History Tab */}
      {activeTab === "credits" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <h2 className="text-xl font-display font-semibold mb-6 text-black">Credit Transaction History</h2>
          {creditHistory === undefined ? (
            <p className="text-sm text-gray-700 font-display">Loading...</p>
          ) : creditHistory.length === 0 ? (
            <p className="text-sm text-gray-700 font-display">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {creditHistory.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-all duration-300"
                >
                  <div>
                    <div className="text-sm font-medium text-black font-display">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold font-display ${
                        transaction.amount > 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Balance: {transaction.balanceAfter}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}


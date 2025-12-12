// components/assessments-list.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./toast";

interface AssessmentsListProps {
  projectId: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export default function AssessmentsList({ projectId }: AssessmentsListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, error: showError, success: showSuccess, ToastComponent } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentDescription, setAssessmentDescription] = useState("");
  const [assessmentType, setAssessmentType] = useState<"blackbox" | "whitebox" | "auto">("auto");
  const [targetType, setTargetType] = useState("web_app");
  const [targetUrl, setTargetUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedType, setDetectedType] = useState<"blackbox" | "whitebox" | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<number[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [hasFetchedRepos, setHasFetchedRepos] = useState(false);
  const [githubAccount, setGithubAccount] = useState<{
    connected: boolean;
    username?: string;
    avatar?: string | null;
  }>({ connected: false });
  const [isCheckingGithub, setIsCheckingGithub] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [repoOptions, setRepoOptions] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  const assessments = useQuery(api.assessments.list, { projectId }) ?? [];
  const createAssessment = useMutation(api.assessments.create);
  const project = useQuery(api.projects.get, { projectId });
  const org = useQuery(
    api.organizations.get,
    project && "orgId" in project && project.orgId ? { orgId: project.orgId } : "skip"
  );
  const subscription = useQuery(
    api.subscriptions.getSubscription,
    project && "orgId" in project && project.orgId ? { orgId: project.orgId } : "skip"
  );
  const hasCredits = org && "credits" in org ? (org.credits ?? 0) > 0 : false;
  const plan = org && "plan" in org ? org.plan : "free";
  const hasActiveSubscription = subscription?.stripeStatus === "active" || subscription?.stripeStatus === "trialing";
  
  // Auto-detect assessment type based on URL
  const detectAssessmentType = (url: string): "blackbox" | "whitebox" | null => {
    if (!url.trim()) return null;
    
    const trimmedUrl = url.trim().toLowerCase();
    
    // Check for git repository patterns
    const gitPatterns = [
      /github\.com/i,
      /gitlab\.com/i,
      /bitbucket\.org/i,
      /\.git$/i,
      /^git@/i,
      /git\+https?:\/\//i,
    ];
    
    const isGitRepo = gitPatterns.some(pattern => pattern.test(trimmedUrl));
    
    if (isGitRepo) {
      return "whitebox";
    }
    
    // Check for HTTP/HTTPS URL (blackbox)
    try {
      const urlObj = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        return "blackbox";
      }
    } catch {
      // Not a valid URL yet
    }
    
    return null;
  };

  // Handle URL input change with auto-detection
  const handleUrlChange = (value: string) => {
    setTargetUrl(value);
    
    // Clear URL errors when user types
    if (errors.targetUrl) {
      setErrors({ ...errors, targetUrl: "" });
    }
    
    // Auto-detect type
    const detected = detectAssessmentType(value);
    setDetectedType(detected);
    
    // Auto-set type if detected
    if (detected) {
      setAssessmentType(detected);
    }
  };

  const refreshGithubStatus = useCallback(async (autoFetchRepos = false) => {
    // Only check GitHub status if user signed in with GitHub
    if (session?.user?.provider !== "github") {
      setGithubAccount({ connected: false });
      setRepoOptions([]);
      setSelectedRepo("");
      return;
    }

    setIsCheckingGithub(true);
    try {
      const response = await fetch("/api/auth/github/status");

      if (!response.ok) {
        throw new Error("Unable to check GitHub connection status.");
      }

      const data = await response.json();

      const isConnected = Boolean(data.connected);
      setGithubAccount({
        connected: isConnected,
        username: data.username,
        avatar: data.avatar,
      });

      if (typeof window !== "undefined") {
        if (isConnected) {
          // Always try to fetch actual repos from GitHub when connected
          // Don't show fake/default repos
          try {
            const reposResponse = await fetch("/api/github/repos");
            if (reposResponse.ok) {
              const reposData = await reposResponse.json();
              if (reposData.repos && reposData.repos.length > 0) {
                setGithubRepos(reposData.repos);
                setHasFetchedRepos(true);
                // Update repoOptions for the dropdown with actual repos
                const repoUrls = reposData.repos.map((repo: GitHubRepo) => 
                  `https://github.com/${repo.full_name}`
                );
                setRepoOptions(repoUrls);
                window.localStorage.setItem("githubRepoCache", JSON.stringify(repoUrls));
              } else {
                // No repos found - clear any cached fake repos
                setRepoOptions([]);
                setGithubRepos([]);
                window.localStorage.removeItem("githubRepoCache");
              }
            } else {
              // API call failed - clear fake repos
              setRepoOptions([]);
              setGithubRepos([]);
              window.localStorage.removeItem("githubRepoCache");
            }
          } catch (repoError) {
            console.error("Failed to fetch repos:", repoError);
            // On error, don't show fake repos - just clear
            setRepoOptions([]);
            setGithubRepos([]);
            window.localStorage.removeItem("githubRepoCache");
          }
        } else {
          window.localStorage.removeItem("githubRepoCache");
          setRepoOptions([]);
          setSelectedRepo("");
          setGithubRepos([]);
        }
      }
    } catch (error: any) {
      console.error("[Assessments] GitHub status check failed", error);
      setGithubError(error?.message || "Failed to check GitHub status.");
    } finally {
      setIsCheckingGithub(false);
    }
  }, [session?.user?.provider]);

  useEffect(() => {
    // Only refresh GitHub status if user is signed in with GitHub
    // Always fetch repos when checking status (don't use autoFetchRepos param anymore)
    if (session?.user?.provider === "github") {
      refreshGithubStatus(true);
    }
  }, [refreshGithubStatus, session?.user?.provider]);

  // Check for GitHub connection success from URL params
  useEffect(() => {
    const githubAuthStatus = searchParams?.get("githubAuthStatus");
    const githubAuthError = searchParams?.get("githubAuthError");
    const githubAuthMessage = searchParams?.get("githubAuthMessage");

    if (githubAuthError) {
      showError(githubAuthError);
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("githubAuthError");
      router.replace(url.pathname + url.search);
    } else if (githubAuthStatus === "connected" || githubAuthStatus === "reauthorized") {
      showSuccess(githubAuthMessage || "GitHub connected successfully!");
      // Refresh GitHub status and fetch repos (always fetches real repos now)
      if (session?.user?.provider === "github") {
        refreshGithubStatus(true);
      }
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("githubAuthStatus");
      url.searchParams.delete("githubAuthMessage");
      router.replace(url.pathname + url.search);
    }
  }, [searchParams, session?.user?.provider, refreshGithubStatus, showSuccess, showError, router]);

  const handleConnectGithub = async () => {
    setGithubError(null);
    setIsConnectingGithub(true);
    try {
      // Get current path for returnTo parameter
      const currentPath = window.location.pathname;
      const returnTo = currentPath || "/settings";
      
      // Redirect to the GitHub OAuth start endpoint
      // The start endpoint will redirect to GitHub, then callback will redirect back
      window.location.href = `/api/auth/github/start?returnTo=${encodeURIComponent(returnTo)}`;
    } catch (error: any) {
      console.error("[Assessments] GitHub connect failed", error);
      setGithubError(error?.message || "GitHub authentication failed.");
      setIsConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    setGithubError(null);
    try {
      const response = await fetch("/api/auth/github/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect GitHub.");
      }

      setGithubAccount({ connected: false });
      setRepoOptions([]);
      setSelectedRepo("");
      setDetectedType(null);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("githubRepoCache");
      }

      if (assessmentType === "whitebox") {
        setTargetUrl("");
      }
    } catch (error: any) {
      console.error("[Assessments] GitHub disconnect failed", error);
      setGithubError(error?.message || "Unable to disconnect GitHub.");
    }
  };

  const handleRepoSelect = (value: string) => {
    setSelectedRepo(value);
    if (value) {
      setTargetUrl(value);
      setDetectedType("whitebox");
      setAssessmentType("whitebox");
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!assessmentName.trim()) {
      newErrors.name = "🤔 Every great assessment needs a name!";
    } else if (assessmentName.length < 3) {
      newErrors.name = "📏 Too short! Give it at least 3 characters.";
    } else if (assessmentName.length > 100) {
      newErrors.name = "📚 Whoa! Keep it under 100 characters, Shakespeare.";
    }

    // URL validation - single input for both types
    if (!targetUrl.trim()) {
      newErrors.targetUrl = "🎯 Please enter a URL or Git repository!";
    } else {
      const detected = detectAssessmentType(targetUrl);
      
      if (!detected) {
        newErrors.targetUrl = "🤨 That doesn't look like a valid URL or Git repository. Try again?";
      } else if (detected === "blackbox") {
        // Validate HTTP/HTTPS URL
        try {
          const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
          if (!url.protocol.match(/^https?:$/)) {
            newErrors.targetUrl = "🔒 Only HTTP/HTTPS URLs allowed. No funny business!";
          }
        } catch {
          newErrors.targetUrl = "🤨 That doesn't look like a valid URL. Try again?";
        }
      } else if (detected === "whitebox") {
        // Validate Git URL format
        if (!targetUrl.match(/^(https?:\/\/|git@).+\.(git|com|org)/i) && !targetUrl.includes('github.com') && !targetUrl.includes('gitlab.com') && !targetUrl.includes('bitbucket.org')) {
          newErrors.targetUrl = "🐙 Hmm, that doesn't look like a git repository URL...";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isWhitebox = useMemo(
    () =>
      assessmentType === "whitebox" ||
      (assessmentType === "auto" && detectedType === "whitebox"),
    [assessmentType, detectedType]
  );

  useEffect(() => {
    if (!isWhitebox) {
      setSelectedRepoIds([]);
    }
  }, [isWhitebox]);

  const fetchGithubRepos = async () => {
    // Only allow GitHub users
    if (session?.user?.provider !== "github") {
      setRepoError("GitHub repository access is only available for users who signed in with GitHub.");
      return;
    }

    if (!githubAccount.connected) {
      setRepoError("Please connect your GitHub account first.");
      return;
    }

    setIsLoadingRepos(true);
    setRepoError(null);

    try {
      const response = await fetch("/api/github/repos");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to fetch GitHub repositories");
      }

      const data = await response.json();
      setGithubRepos(data.repos || []);
      setHasFetchedRepos(true);
    } catch (error: any) {
      console.error("Failed to fetch GitHub repos:", error);
      setRepoError(error.message || "Unable to fetch GitHub repositories");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (showCreateForm && isWhitebox && !hasFetchedRepos && !isLoadingRepos && session?.user?.provider === "github" && githubAccount.connected) {
      fetchGithubRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateForm, isWhitebox, hasFetchedRepos, isLoadingRepos, session?.user?.provider, githubAccount.connected]);

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return githubRepos;

    const term = repoSearch.toLowerCase();
    return githubRepos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.full_name.toLowerCase().includes(term)
    );
  }, [repoSearch, githubRepos]);

  const toggleRepoSelection = (repoId: number) => {
    setSelectedRepoIds((prev) =>
      prev.includes(repoId)
        ? prev.filter((id) => id !== repoId)
        : [...prev, repoId]
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError("🚨 Oops! Fix the errors below before launching your scan.");
      return;
    }

    if (!session?.user?.id) {
      showError("🔐 You need to be logged in to create assessments!");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine final type (use detected if auto, otherwise use selected)
      const finalType = assessmentType === "auto" && detectedType ? detectedType : (assessmentType as "blackbox" | "whitebox");
      
      if (!finalType) {
        showError("🚨 Could not determine assessment type. Please check your URL.");
        return;
      }

      // Normalize URL for blackbox (add https:// if missing)
      let normalizedUrl = targetUrl.trim();
      if (finalType === "blackbox" && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      // Create assessment (status will be "running")
      const assessmentId = await createAssessment({
        projectId,
        name: assessmentName,
        description: assessmentDescription || undefined,
        type: finalType,
        targetType,
        targetUrl: finalType === "blackbox" ? normalizedUrl : undefined,
        gitRepoUrl: finalType === "whitebox" ? normalizedUrl : undefined,
        githubRepoIds: finalType === "whitebox" && selectedRepoIds.length > 0 ? selectedRepoIds : undefined,
        createdByUserId: session.user.id,
      });

      showSuccess("🚀 Assessment launched! Get ready for some security magic...");
      
      setAssessmentName("");
      setAssessmentDescription("");
      setTargetUrl("");
      setDetectedType(null);
      setAssessmentType("auto");
      setGithubRepos([]);
      setSelectedRepoIds([]);
      setRepoSearch("");
      setHasFetchedRepos(false);
      setRepoError(null);
      setErrors({});
      setShowCreateForm(false);

      // Redirect to assessment detail page to show loading state
      // The scan will be automatically triggered on the detail page
      setTimeout(() => {
        router.push(`/assessments/${assessmentId}`);
      }, 500);
    } catch (error: any) {
      console.error("Assessment creation error:", error);
      
      let errorMessage = "💥 Something went wrong!";
      if (error?.message?.includes("credits")) {
        errorMessage = "💳 Oops! You're out of credits. Time to upgrade!";
      } else if (error?.message?.includes("subscription") || error?.message?.includes("payment")) {
        errorMessage = "💳 Your subscription needs attention. Please check your payment method in Settings.";
        // Optionally redirect to settings
        setTimeout(() => {
          router.push("/settings");
        }, 2000);
      } else if (error?.message?.includes("not found")) {
        errorMessage = "🔍 Project not found. Did it disappear?";
      } else if (error?.message) {
        errorMessage = `😅 ${error.message}`;
      }
      
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "running":
        return "bg-blue-500/20 text-blue-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <>
      {ToastComponent}
      <section className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold text-foreground">Assessments</h2>
        <div className="flex items-center gap-3">
          {org && "credits" in org && (
            <div className="text-xs text-muted-foreground">
              Credits:{" "}
              <span
                className={`font-semibold ${
                  (org.credits ?? 0) < 3 ? "text-yellow-700" : "text-foreground"
                }`}
              >
                {org.credits ?? 0}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!hasCredits}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display"
            title={!hasCredits ? "Insufficient credits. Please upgrade your plan." : ""}
          >
            {showCreateForm ? "Cancel" : "+ New Assessment"}
          </button>
        </div>
      </div>

      {org && "credits" in org && (org.credits ?? 0) < 3 && (org.credits ?? 0) > 0 && (
        <div className="rounded-xl border border-yellow-500/50 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-900 font-display">
            ⚠️ Low credits! You have {org.credits ?? 0} credit(s) remaining.{" "}
            <Link href="/settings" className="underline hover:text-yellow-800 transition-colors">
              Upgrade your plan
            </Link>{" "}
            to get more credits.
          </p>
        </div>
      )}

      {org && "credits" in org && (org.credits ?? 0) === 0 && (
        <div className="rounded-xl border border-red-500/50 bg-red-50 p-4">
          <p className="text-sm text-red-900 font-display">
            ❌ No credits remaining.{" "}
            <Link href="/settings" className="underline hover:text-red-800 transition-colors">
              Upgrade your plan
            </Link>{" "}
            to create assessments.
          </p>
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 font-display">
              Assessment Name *
            </label>
            <input
              type="text"
              placeholder="Security Scan - Q1 2025"
              value={assessmentName}
              onChange={(e) => {
                setAssessmentName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              className={`w-full rounded-xl border ${errors.name ? 'border-red-500 focus:ring-red-400' : 'border-border focus:ring-primary/40'} bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary transition-all duration-300`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 font-display animate-slide-in-down">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2 font-display">
              Description (optional)
            </label>
            <textarea
              placeholder="Brief description of this assessment..."
              value={assessmentDescription}
              onChange={(e) => setAssessmentDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300 resize-none"
            />
          </div>

          {session?.user?.provider === "github" ? (
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {githubAccount.connected ? (
                  <>
                    {githubAccount.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={githubAccount.avatar}
                        alt="GitHub avatar"
                        className="h-10 w-10 rounded-full border border-border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-800 border border-border flex items-center justify-center text-lg">
                        🐙
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground font-display">Connected to GitHub</p>
                      <p className="text-xs text-muted-foreground">
                        {githubAccount.username || "Authenticated GitHub user"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-border flex items-center justify-center text-lg">
                      🐙
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground font-display">Connect GitHub</p>
                      <p className="text-xs text-muted-foreground">Authorize to pick repositories for whitebox scans.</p>
                    </div>
                  </>
                )}
              </div>
              {githubAccount.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectGithub}
                  className="text-xs px-3 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  disabled={isConnectingGithub || isCheckingGithub}
                  className="text-xs px-3 py-2 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 text-white hover:from-slate-700 hover:to-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isConnectingGithub || isCheckingGithub ? "Connecting..." : "Connect GitHub"}
                </button>
              )}
            </div>

            {githubError && (
              <p className="text-xs text-red-500 font-display animate-slide-in-down">{githubError}</p>
            )}
          </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-sm text-muted-foreground font-display">
                💡 GitHub repository selection is only available when you sign in with GitHub. 
                <Link href="/auth/login" className="text-primary hover:underline ml-1">
                  Switch to GitHub sign-in
                </Link>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 font-display">
                Assessment Type *
              </label>
              <select
                value={assessmentType}
                onChange={(e) => {
                  const newType = e.target.value as "blackbox" | "whitebox" | "auto";
                  setAssessmentType(newType);
                  // Re-detect if switching to auto
                  if (newType === "auto" && targetUrl) {
                    const detected = detectAssessmentType(targetUrl);
                    setDetectedType(detected);
                  }
                }}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
              >
                <option value="auto">Auto-detect</option>
                <option value="blackbox">Blackbox</option>
                <option value="whitebox">Whitebox</option>
              </select>
              {detectedType && assessmentType === "auto" && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✨ Detected: <span className="font-semibold capitalize">{detectedType}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 font-display">
                Target Type *
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
              >
                <option value="web_app">Web Application</option>
                <option value="api">API</option>
                <option value="mobile">Mobile App</option>
                <option value="network">Network</option>
              </select>
            </div>
          </div>

          {session?.user?.provider === "github" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 font-display">
              GitHub Repository (optional)
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => handleRepoSelect(e.target.value)}
                disabled={!githubAccount.connected || githubRepos.length === 0}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                  {!githubAccount.connected
                    ? "Connect GitHub to choose a repository"
                    : isLoadingRepos
                    ? "Loading repositories..."
                    : githubRepos.length === 0
                    ? "No repositories found"
                    : "Select a repository"}
              </option>
                {githubRepos.map((repo) => (
                  <option key={repo.id} value={`https://github.com/${repo.full_name}`}>
                    {repo.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
                {githubAccount.connected
                  ? "Select a repository from your GitHub account to auto-fill the Git URL."
                  : "Connect GitHub to access your repositories."}
            </p>
          </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2 font-display">
              URL or Git Repository *
            </label>
            <input
              type="text"
              placeholder="https://app.example.com or https://github.com/user/repo.git"
              value={targetUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={`w-full rounded-xl border ${errors.targetUrl ? 'border-red-500 focus:ring-red-400' : 'border-border focus:ring-primary/40'} bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary transition-all duration-300`}
            />
            {errors.targetUrl && (
              <p className="text-xs text-red-500 mt-1 font-display animate-slide-in-down">{errors.targetUrl}</p>
            )}
            {!errors.targetUrl && detectedType && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {detectedType === "blackbox" ? (
                  <>
                    <span className="text-blue-600 dark:text-blue-400">🔵</span>
                    <span className="text-muted-foreground">Detected as <span className="font-semibold">Blackbox</span> (web application)</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-600 dark:text-green-400">🟢</span>
                    <span className="text-muted-foreground">Detected as <span className="font-semibold">Whitebox</span> (source code analysis)</span>
                  </>
                )}
              </div>
            )}
            {!errors.targetUrl && !detectedType && targetUrl && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 Enter a web URL (https://example.com) or Git repository (github.com/user/repo)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 font-display disabled:hover:scale-100"
          >
            {isSubmitting ? "🚀 Launching scan..." : "Create Assessment"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-display">
              No assessments yet. Create your first assessment to start scanning.
            </p>
          </div>
        ) : (
          assessments.map((assessment, index) => (
            <Link
              key={assessment._id}
              href={`/assessments/${assessment._id}`}
              className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg text-foreground">{assessment.name}</h3>
                  {assessment.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {assessment.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">{assessment.type}</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">{assessment.targetType}</span>
                    {assessment.targetUrl && (
                      <span className="truncate max-w-xs text-muted-foreground">{assessment.targetUrl}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize border ${getStatusColor(
                      assessment.status
                    )}`}
                  >
                    {assessment.status}
                  </span>
                  <span className="text-sky-600 text-xl">→</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
    </>
  );
}

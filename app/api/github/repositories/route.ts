import { NextRequest, NextResponse } from "next/server";

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  html_url: string;
  private: boolean;
  owner?: {
    login?: string;
  };
}

const REQUIRED_SCOPES = ["repo", "read:user"];

function parseScopes(headerValue: string | null): string[] {
  if (!headerValue) return [];
  return headerValue
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function formatRateLimitMessage(headers: Headers, fallback: string) {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  if (remaining === "0") {
    const resetDate = reset ? new Date(parseInt(reset, 10) * 1000) : null;
    const resetTime = resetDate ? resetDate.toLocaleTimeString() : "later";
    return `GitHub rate limit exceeded. Try again around ${resetTime}.`;
  }

  return fallback;
}

function createErrorResponse(status: number, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ error: { message, details } }, { status });
}

function parseGitHubError(status: number, bodyMessage: string | undefined, headers: Headers) {
  if (status === 401) {
    if (headers.get("x-github-otp")?.includes("required")) {
      return "Two-factor authentication is required for this token. Please generate a new token after completing 2FA.";
    }
    return "GitHub rejected this token. It may be expired or revoked.";
  }

  if (status === 403) {
    const base = bodyMessage || "GitHub rejected the request.";
    return formatRateLimitMessage(headers, base.includes("API rate limit") ? "GitHub rate limit reached. Please wait before retrying." : base);
  }

  if (status === 404) {
    return "GitHub resource not found. Verify that the repository exists and you have access.";
  }

  return bodyMessage || "Unexpected GitHub error. Please try again.";
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    return createErrorResponse(400, "Invalid request payload. Please resend the token and repository details.");
  }

  const token = body?.token as string | undefined;
  const selectedRepos = (body?.selectedRepos as string[] | undefined) ?? [];

  if (!token) {
    return createErrorResponse(400, "GitHub token is required to load repositories.");
  }

  const baseHeaders: HeadersInit = {
    Accept: "application/vnd.github+json",
    Authorization: `token ${token}`,
  };

  const userResponse = await fetch("https://api.github.com/user", {
    headers: baseHeaders,
    cache: "no-store",
  });

  if (!userResponse.ok) {
    const bodyJson = (await userResponse.json().catch(() => ({}))) as { message?: string };
    const message = parseGitHubError(userResponse.status, bodyJson.message, userResponse.headers);
    return createErrorResponse(userResponse.status, message);
  }

  const scopes = parseScopes(userResponse.headers.get("x-oauth-scopes"));
  const missingScopes = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope));

  if (missingScopes.length > 0) {
    return createErrorResponse(403, "Your token is missing required scopes.", {
      required: REQUIRED_SCOPES,
      granted: scopes,
    });
  }

  const userData = (await userResponse.json()) as { login?: string; id?: number };
  const login = userData.login;

  if (!login) {
    return createErrorResponse(500, "Could not determine GitHub user from the provided token.");
  }

  const reposResponse = await fetch(
    "https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator,organization_member",
    {
      headers: baseHeaders,
      cache: "no-store",
    }
  );

  if (!reposResponse.ok) {
    const bodyJson = (await reposResponse.json().catch(() => ({}))) as { message?: string };
    const message = parseGitHubError(reposResponse.status, bodyJson.message, reposResponse.headers);
    return createErrorResponse(reposResponse.status, message);
  }

  const reposJson = (await reposResponse.json()) as GitHubRepoResponse[];
  const repos = reposJson.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    cloneUrl: repo.clone_url,
    htmlUrl: repo.html_url,
    owner: repo.owner?.login,
    private: repo.private,
  }));

  const ownershipIssues: string[] = [];
  for (const repoName of selectedRepos) {
    const repo = repos.find((r) => r.fullName === repoName);
    if (!repo) {
      ownershipIssues.push(`Repository ${repoName} is not accessible with this token.`);
      continue;
    }
    if (repo.owner && repo.owner !== login) {
      ownershipIssues.push(`Repository ${repoName} is owned by ${repo.owner}, not ${login}. Use a token from the owner account.`);
    }
  }

  return NextResponse.json({
    user: { login, id: userData.id },
    scopes,
    repos,
    ownershipIssues,
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { decryptToken } from "@/lib/githubAuth";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

interface CachedRepos {
  expiresAt: number;
  repos: GitHubRepo[];
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const repoCache = new Map<string, CachedRepos>();

async function fetchGitHubRepos(accessToken: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Chack-App",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API error (${response.status}): ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as GitHubRepo[];
    repos.push(...data);

    if (data.length < 100) {
      break;
    }

    page += 1;
  }

  return repos;
}

function normalizeRepos(repos: GitHubRepo[]) {
  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    permissions: {
      admin: repo.permissions?.admin ?? false,
      push: repo.permissions?.push ?? false,
      pull: repo.permissions?.pull ?? false,
    },
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow GitHub users
  if (session.user.provider !== "github") {
    return NextResponse.json(
      { error: "GitHub repository access is only available for users who signed in with GitHub." },
      { status: 403 }
    );
  }

  try {
    // Fetch token from githubTokens table
    const tokenData = await fetchQuery(api.githubTokens.getToken, {
      userId: session.user.id,
      tokenType: "oauth",
    });

    if (!tokenData) {
      return NextResponse.json(
        { error: "No GitHub token found. Please connect your GitHub account first." },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: "GitHub token has expired. Please reconnect your GitHub account." },
        { status: 401 }
      );
    }

    // Decrypt token
    let tokenInfo: any;
    try {
      tokenInfo = decryptToken(tokenData.encryptedToken);
    } catch (error) {
      console.error("Failed to decrypt GitHub token:", error);
      return NextResponse.json(
        { error: "Failed to decrypt GitHub token." },
        { status: 500 }
      );
    }

    const accessToken = tokenInfo.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Invalid GitHub token." },
        { status: 401 }
      );
    }

    // Check cache
    const cached = repoCache.get(session.user.id);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({ repos: normalizeRepos(cached.repos), cached: true });
    }

    // Fetch repos from GitHub
    const repos = await fetchGitHubRepos(accessToken);
    repoCache.set(session.user.id, {
      expiresAt: now + CACHE_TTL_MS,
      repos,
    });

    return NextResponse.json({ repos: normalizeRepos(repos), cached: false });
  } catch (error: any) {
    console.error("Failed to fetch GitHub repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub repositories", details: error.message },
      { status: 500 }
    );
  }
}

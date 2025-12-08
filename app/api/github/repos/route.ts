import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
      `https://api.github.com/user/repos?visibility=private&per_page=100&page=${page}`,
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

  if (!session.accessToken || session.user.provider !== "github") {
    return NextResponse.json(
      { error: "GitHub account with an active token is required." },
      { status: 400 }
    );
  }

  const cached = repoCache.get(session.user.id);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ repos: normalizeRepos(cached.repos), cached: true });
  }

  try {
    const repos = await fetchGitHubRepos(session.accessToken);
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

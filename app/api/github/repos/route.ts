import { NextRequest, NextResponse } from "next/server.js";
import { getToken } from "next-auth/jwt";

const GITHUB_API_URL = "https://api.github.com";

function parsePagination(searchParams: URLSearchParams) {
  const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);
  const perPageParam = Number.parseInt(searchParams.get("perPage") || "30", 10);

  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const perPageRaw = Number.isNaN(perPageParam) ? 30 : perPageParam;
  const perPage = Math.min(Math.max(perPageRaw, 1), 100);

  return { page, perPage };
}

export async function GET(request: NextRequest) {
  const headerToken = request.headers.get("x-github-token");
  const headerProvider = request.headers.get("x-github-provider");
  const token = headerToken
    ? { accessToken: headerToken, provider: headerProvider || "github" }
    : await getToken({ req: request });

  if (!token?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token.provider !== "github") {
    return NextResponse.json({ error: "Invalid provider for GitHub" }, { status: 400 });
  }

  const { page, perPage } = parsePagination(new URL(request.url).searchParams);

  try {
    const response = await fetch(
      `${GITHUB_API_URL}/user/repos?per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: "GitHub request failed",
          status: response.status,
          details: details || response.statusText,
        },
        { status: response.status }
      );
    }

    const repos = await response.json();
    const linkHeader = response.headers.get("link") || "";
    const hasNextPage = linkHeader.includes('rel="next"');

    return NextResponse.json({
      repos,
      pagination: {
        page,
        perPage,
        hasNextPage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: message,
      },
      { status: 500 }
    );
  }
}

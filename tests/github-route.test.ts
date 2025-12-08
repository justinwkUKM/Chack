import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { NextRequest } from "next/server.js";

const { GET } = await import("../app/api/github/repos/route.ts");

describe("GitHub repo route", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("rejects requests without an access token", async () => {
    const request = new NextRequest("http://localhost/api/github/repos");
    const response = await GET(request);
    assert.strictEqual(response.status, 401);
  });

  it("rejects non-GitHub providers", async () => {
    const request = new NextRequest("http://localhost/api/github/repos", {
      headers: { "x-github-token": "abc", "x-github-provider": "google" },
    });
    const response = await GET(request);
    const body = await response.json();
    assert.strictEqual(response.status, 400);
    assert.ok(body.error.includes("Invalid provider"));
  });

  it("returns paginated repositories and detects next page", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response(JSON.stringify([{ name: "repo-a" }, { name: "repo-b" }]), {
        status: 200,
        headers: {
          link: "<https://api.github.com/user/repos?page=2>; rel=\"next\"",
        },
      });
    });

    const request = new NextRequest("http://localhost/api/github/repos?page=1&perPage=2", {
      headers: { "x-github-token": "abc", "x-github-provider": "github" },
    });
    const response = await GET(request);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.repos.length, 2);
    assert.deepStrictEqual(body.pagination, { page: 1, perPage: 2, hasNextPage: true });
  });

  it("bubbles up GitHub API errors", async () => {
    mock.method(globalThis, "fetch", async () => {
      return new Response("rate limited", { status: 429 });
    });

    const request = new NextRequest("http://localhost/api/github/repos", {
      headers: { "x-github-token": "abc", "x-github-provider": "github" },
    });
    const response = await GET(request);
    const body = await response.json();

    assert.strictEqual(response.status, 429);
    assert.ok(body.error.includes("GitHub request failed"));
    assert.strictEqual(body.details, "rate limited");
  });
});

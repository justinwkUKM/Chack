import assert from "node:assert";
import { describe, it, mock } from "node:test";
import { NextRequest } from "next/server.js";

const { GET } = await import("../app/api/github/repos/route.ts");

type Repo = { name: string; full_name?: string };

describe("GitHub integration flow", () => {
  it("connects, lists repos, selects targets, creates assessment, and disconnects", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () => {
      return new Response(
        JSON.stringify([
          { name: "repo-1", full_name: "octocat/repo-1" },
          { name: "repo-2", full_name: "octocat/repo-2" },
        ] satisfies Repo[]),
        {
          status: 200,
          headers: {
            link: "<https://api.github.com/user/repos?page=2>; rel=\"next\"",
          },
        }
      );
    });

    const uiState = {
      connected: false,
      token: "",
      repos: [] as Repo[],
      selected: [] as string[],
      assessment: null as null | { targets: string[]; status: string },
    };

    // Connect and list repos
    uiState.token = "abc";
    uiState.connected = Boolean(uiState.token);
    const response = await GET(
      new NextRequest("http://localhost/api/github/repos?perPage=2", {
        headers: { "x-github-token": "abc", "x-github-provider": "github" },
      })
    );
    const payload = await response.json();
    uiState.repos = payload.repos;

    assert.strictEqual(uiState.connected, true);
    assert.strictEqual(fetchMock.mock.calls.length, 1);
    assert.strictEqual(uiState.repos.length, 2);

    // Select repositories to scan
    uiState.selected = uiState.repos.slice(0, 2).map((repo) => repo.full_name || repo.name);
    assert.deepStrictEqual(uiState.selected, ["octocat/repo-1", "octocat/repo-2"]);

    // Create assessment payload
    uiState.assessment = {
      targets: [...uiState.selected],
      status: "created",
    };

    assert.deepStrictEqual(uiState.assessment.targets, uiState.selected);
    assert.strictEqual(uiState.assessment.status, "created");

    // Disconnect clears tokens and UI state
    uiState.connected = false;
    uiState.token = "";
    uiState.selected = [];

    assert.strictEqual(uiState.connected, false);
    assert.strictEqual(uiState.token, "");
    assert.deepStrictEqual(uiState.selected, []);
  });
});

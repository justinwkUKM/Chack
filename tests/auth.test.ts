import assert from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { ConvexHttpClient } from "convex/browser";

const { authCallbacks } = await import("../lib/auth-callbacks.ts");

process.env.NEXTAUTH_SECRET = "test-secret";

afterEach(() => {
  mock.restoreAll();
});

describe("authOptions callbacks", () => {
  it("stores access token and provider in JWT payload", async () => {
    const token = await authCallbacks?.jwt?.({
      token: { sub: "user-1" } as any,
      account: { access_token: "gh-token", provider: "github" } as any,
      user: { id: "user-1" } as any,
    });

    assert.strictEqual(token?.accessToken, "gh-token");
    assert.strictEqual(token?.provider, "github");
  });

  it("returns existing token data when account is missing", async () => {
    const token = await authCallbacks?.jwt?.({
      token: { sub: "user-2", accessToken: "existing" } as any,
      account: undefined,
      user: { id: "user-2" } as any,
    });

    assert.strictEqual(token?.accessToken, "existing");
    assert.strictEqual(token?.provider, undefined);
  });

  it("hydrates the session with Convex user data", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.com";
    mock.method(ConvexHttpClient.prototype as any, "query", async () => ({
      name: "Convex User",
      email: "convex@example.com",
      image: "https://example.com/avatar.png",
    }));

    const session = {
      user: {
        id: "",
        email: "original@example.com",
        name: "Original",
        image: undefined,
      },
    } as any;

    const hydrated = await authCallbacks?.session?.({
      session,
      token: {
        sub: "user-3",
        accessToken: "token-3",
        provider: "github",
      } as any,
    });

    assert.strictEqual(hydrated?.user.id, "user-3");
    assert.strictEqual(hydrated?.user.provider, "github");
    assert.strictEqual(hydrated?.accessToken, "token-3");
    assert.strictEqual(hydrated?.user.name, "Convex User");
    assert.strictEqual(hydrated?.user.email, "convex@example.com");
    assert.strictEqual(hydrated?.user.image, "https://example.com/avatar.png");
  });
});

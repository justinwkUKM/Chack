import { describe, expect, it } from "@jest/globals";
import {
  checkRateLimit,
  cleanupRateLimitStore,
  sanitizeInput,
  sanitizeJSONForHTML,
  validateGitHubInstallationId,
  validateGitHubURL,
  validateURL,
} from "../lib/security";

describe("sanitizeJSONForHTML", () => {
  it("escapes HTML entities in JSON", () => {
    const unsafe = { html: "<script>alert('xss')</script> & more" };
    expect(sanitizeJSONForHTML(unsafe)).toBe(
      '{"html":"&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt; &amp; more"}'
    );
  });
});

describe("validateURL", () => {
  it("accepts http and https urls", () => {
    expect(validateURL("https://example.com")).toBe(true);
    expect(validateURL("http://example.com")).toBe(true);
  });

  it("rejects javascript and data protocols", () => {
    expect(validateURL("javascript:alert(1)")).toBe(false);
    expect(validateURL("data:text/html;base64,abcd")).toBe(false);
  });
});

describe("validateGitHubURL", () => {
  it("requires github.com host and owner/repo path", () => {
    expect(validateGitHubURL("https://github.com/owner/repo")).toBe(true);
    expect(validateGitHubURL("https://example.com/owner/repo")).toBe(false);
    expect(validateGitHubURL("https://github.com/owner")).toBe(false);
  });
});

describe("validateGitHubInstallationId", () => {
  it("only accepts numeric ids", () => {
    expect(validateGitHubInstallationId("123")).toBe(true);
    expect(validateGitHubInstallationId("abc")).toBe(false);
    expect(validateGitHubInstallationId(undefined)).toBe(false);
  });
});

describe("sanitizeInput", () => {
  it("trims, strips control chars, and respects length", () => {
    const result = sanitizeInput("  hello\0world\u0007", 5);
    expect(result).toBe("hello");
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeInput(123 as any)).toBe("");
  });
});

describe("rate limit helpers", () => {
  it("tracks requests and blocks when limit exceeded", () => {
    const id = "user-1";
    const first = checkRateLimit(id, 2, 1000);
    const second = checkRateLimit(id, 2, 1000);
    const third = checkRateLimit(id, 2, 1000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("cleans up expired entries", async () => {
    const id = "user-2";
    checkRateLimit(id, 1, 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    cleanupRateLimitStore();
    const result = checkRateLimit(id, 1, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyTurnstile } from "../../src/middleware/turnstile.js";

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success in dev mode (no secret, token provided)", async () => {
    const result = await verifyTurnstile("some-token", {});
    expect(result.success).toBe(true);
  });

  it("returns failure when no token provided", async () => {
    const result = await verifyTurnstile(null, {});
    expect(result.success).toBe(false);
  });

  it("returns failure when secret set but no token", async () => {
    const result = await verifyTurnstile(null, {
      TURNSTILE_SECRET: "test-secret",
    });
    expect(result.success).toBe(false);
  });

  it("returns failure when token is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
    });

    const result = await verifyTurnstile("invalid-token", {
      TURNSTILE_SECRET: "test-secret",
    });
    expect(result.success).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.anything(),
    );
  });
});

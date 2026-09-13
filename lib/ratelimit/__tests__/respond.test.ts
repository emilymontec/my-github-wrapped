import { describe, expect, it, vi, beforeEach } from "vitest";

const checkRateLimitMock = vi.fn();

vi.mock("@/lib/ratelimit/index", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  RATE_LIMITS: {
    sync: { limit: 5, windowMs: 60 * 60 * 1000 },
    wrappedGenerate: { limit: 10, windowMs: 60 * 60 * 1000 },
    comparisonInvite: { limit: 20, windowMs: 60 * 60 * 1000 },
    wrappedImage: { limit: 30, windowMs: 60 * 60 * 1000 }
  }
}));

import { enforceRateLimit } from "@/lib/ratelimit/respond";

describe("enforceRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve null cuando la request está permitida", async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfterSeconds: 3000
    });

    const result = await enforceRateLimit("sync", "user-1");

    expect(result).toBeNull();
    expect(checkRateLimitMock).toHaveBeenCalledWith("sync:user-1", expect.objectContaining({ limit: 5 }));
  });

  it("devuelve una respuesta 429 con headers cuando se excede el límite", async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      retryAfterSeconds: 120
    });

    const result = await enforceRateLimit("wrappedGenerate", "user-2");

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    expect(result?.headers.get("Retry-After")).toBe("120");
    expect(result?.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(result?.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("arma la key como '{action}:{userId}'", async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: true, limit: 20, remaining: 19, retryAfterSeconds: 0 });

    await enforceRateLimit("comparisonInvite", "abc123");

    expect(checkRateLimitMock).toHaveBeenCalledWith("comparisonInvite:abc123", expect.anything());
  });
});

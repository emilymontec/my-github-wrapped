import { describe, expect, it } from "vitest";
import { evaluateRateLimit } from "@/lib/ratelimit/evaluate";

const config = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5 por hora

describe("evaluateRateLimit", () => {
  it("permite mientras count <= limit", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const windowStart = new Date("2026-01-01T09:30:00Z");

    for (let count = 1; count <= 5; count++) {
      const decision = evaluateRateLimit(count, windowStart, now, config);
      expect(decision.allowed).toBe(true);
    }
  });

  it("bloquea apenas count supera el límite", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const windowStart = new Date("2026-01-01T09:30:00Z");

    const decision = evaluateRateLimit(6, windowStart, now, config);
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
  });

  it("calcula remaining correctamente por debajo del límite", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const windowStart = new Date("2026-01-01T09:30:00Z");

    const decision = evaluateRateLimit(2, windowStart, now, config);
    expect(decision.remaining).toBe(3);
  });

  it("nunca devuelve remaining negativo aunque count exceda mucho el límite", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const windowStart = new Date("2026-01-01T09:30:00Z");

    const decision = evaluateRateLimit(50, windowStart, now, config);
    expect(decision.remaining).toBe(0);
  });

  it("calcula retryAfterSeconds como el tiempo restante hasta el fin de la ventana", () => {
    const windowStart = new Date("2026-01-01T09:00:00Z");
    const now = new Date("2026-01-01T09:45:00Z"); // 15 min dentro de una ventana de 60 min

    const decision = evaluateRateLimit(6, windowStart, now, config);
    expect(decision.retryAfterSeconds).toBe(15 * 60);
  });

  it("nunca devuelve retryAfterSeconds negativo si la ventana ya venció", () => {
    const windowStart = new Date("2026-01-01T09:00:00Z");
    const now = new Date("2026-01-01T11:00:00Z"); // 2h después, ventana de 1h ya pasó

    const decision = evaluateRateLimit(1, windowStart, now, config);
    expect(decision.retryAfterSeconds).toBe(0);
  });

  it("expone el limit configurado sin modificarlo", () => {
    const decision = evaluateRateLimit(1, new Date(), new Date(), config);
    expect(decision.limit).toBe(5);
  });
});

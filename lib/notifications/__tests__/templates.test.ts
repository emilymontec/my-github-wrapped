import { describe, expect, it } from "vitest";
import { wrappedReadyEmail, streakMilestoneEmail } from "@/lib/notifications/templates";

describe("wrappedReadyEmail", () => {
  it("incluye el año y un saludo personalizado cuando hay displayName", () => {
    const content = wrappedReadyEmail({ displayName: "emily", year: 2026 });

    expect(content.subject).toContain("2026");
    expect(content.text).toContain("Hola emily");
    expect(content.html).toContain("/wrapped/2026");
  });

  it("usa un saludo genérico cuando displayName es null", () => {
    const content = wrappedReadyEmail({ displayName: null, year: 2025 });

    expect(content.text.startsWith("Hola,")).toBe(true);
  });

  it("respeta locale='en'", () => {
    const content = wrappedReadyEmail({ displayName: "emily", year: 2026, locale: "en" });

    expect(content.subject).toBe("Your GitHub Wrapped 2026 is ready 🎉");
    expect(content.text).toContain("Hi emily");
    expect(content.html).toContain('lang="en"');
  });
});

describe("streakMilestoneEmail", () => {
  it("usa la etiqueta y descripción reales del catálogo de badges", () => {
    const content = streakMilestoneEmail({
      displayName: "emily",
      badgeType: "streak_30",
      streakLength: 30
    });

    expect(content.subject).toContain("Racha de 30 días");
    expect(content.text).toContain("30 días");
    expect(content.html).toContain("Racha de 30 días");
  });

  it("refleja streak_100 correctamente", () => {
    const content = streakMilestoneEmail({
      displayName: null,
      badgeType: "streak_100",
      streakLength: 100
    });

    expect(content.subject).toContain("Racha de 100 días");
    expect(content.text).toContain("100 días");
  });

  it("respeta locale='en', incluyendo la etiqueta del badge en inglés", () => {
    const content = streakMilestoneEmail({
      displayName: "emily",
      badgeType: "streak_30",
      streakLength: 30,
      locale: "en"
    });

    expect(content.subject).toBe("New streak unlocked: 30-day streak 🔥");
    expect(content.text).toContain("Hi emily");
    expect(content.text).toContain("30-day coding streak");
    expect(content.html).toContain('lang="en"');
  });
});

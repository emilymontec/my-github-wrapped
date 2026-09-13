import { describe, expect, it } from "vitest";
import { detectEligibleBadges, BADGE_TYPES, BADGE_INFO, getBadgeInfo } from "@/lib/gamification/badges";
import { buildAnalyticsFixture } from "@/lib/insights/__tests__/fixtures";

function typesOf(analytics: ReturnType<typeof buildAnalyticsFixture>) {
  return detectEligibleBadges(analytics).map((b) => b.type);
}

describe("detectEligibleBadges — streaks", () => {
  it("no otorga streak_7 justo debajo del umbral (6 días)", () => {
    const analytics = buildAnalyticsFixture({
      streaks: { currentStreak: 6, longestStreak: 6, streakStart: null, streakEnd: null }
    });
    expect(typesOf(analytics)).not.toContain("streak_7");
  });

  it("otorga streak_7 exactamente en el umbral (7 días)", () => {
    const analytics = buildAnalyticsFixture({
      streaks: { currentStreak: 7, longestStreak: 7, streakStart: null, streakEnd: null }
    });
    expect(typesOf(analytics)).toContain("streak_7");
  });

  it("una racha de 100 días otorga los tres tiers a la vez", () => {
    const analytics = buildAnalyticsFixture({
      streaks: { currentStreak: 100, longestStreak: 100, streakStart: null, streakEnd: null }
    });
    const types = typesOf(analytics);
    expect(types).toContain("streak_7");
    expect(types).toContain("streak_30");
    expect(types).toContain("streak_100");
  });

  it("una racha de 10 días NO otorga streak_30 ni streak_100", () => {
    const analytics = buildAnalyticsFixture({
      streaks: { currentStreak: 10, longestStreak: 10, streakStart: null, streakEnd: null }
    });
    const types = typesOf(analytics);
    expect(types).toContain("streak_7");
    expect(types).not.toContain("streak_30");
    expect(types).not.toContain("streak_100");
  });
});

describe("detectEligibleBadges — polyglot_5", () => {
  it("no otorga con 4 lenguajes", () => {
    const analytics = buildAnalyticsFixture({
      languageStats: {
        topLanguage: "TS",
        distribution: [],
        languageCount: 4,
        languageDiversity: 0.9
      }
    });
    expect(typesOf(analytics)).not.toContain("polyglot_5");
  });

  it("otorga con exactamente 5 lenguajes", () => {
    const analytics = buildAnalyticsFixture({
      languageStats: {
        topLanguage: "TS",
        distribution: [],
        languageCount: 5,
        languageDiversity: 0.9
      }
    });
    expect(typesOf(analytics)).toContain("polyglot_5");
  });
});

describe("detectEligibleBadges — night_shift", () => {
  it("no otorga con pocos commits aunque el % nocturno sea alto", () => {
    const analytics = buildAnalyticsFixture({
      commitStats: {
        totalCommits: 5,
        averageCommitsPerDay: 0,
        averageCommitsPerWeek: 0,
        averageCommitsPerMonth: 0,
        activeDays: 5
      },
      temporal: { ...buildAnalyticsFixture().temporal, nightActivityPercentage: 90 }
    });
    expect(typesOf(analytics)).not.toContain("night_shift");
  });

  it("no otorga con exactamente 50% (el umbral es estrictamente mayor)", () => {
    const analytics = buildAnalyticsFixture({
      commitStats: {
        totalCommits: 40,
        averageCommitsPerDay: 0,
        averageCommitsPerWeek: 0,
        averageCommitsPerMonth: 0,
        activeDays: 20
      },
      temporal: { ...buildAnalyticsFixture().temporal, nightActivityPercentage: 50 }
    });
    expect(typesOf(analytics)).not.toContain("night_shift");
  });

  it("otorga con >50% y muestra suficiente", () => {
    const analytics = buildAnalyticsFixture({
      commitStats: {
        totalCommits: 40,
        averageCommitsPerDay: 0,
        averageCommitsPerWeek: 0,
        averageCommitsPerMonth: 0,
        activeDays: 20
      },
      temporal: { ...buildAnalyticsFixture().temporal, nightActivityPercentage: 51 }
    });
    expect(typesOf(analytics)).toContain("night_shift");
  });
});

describe("detectEligibleBadges — volumen (century_club / marathon)", () => {
  it("otorga century_club a partir de 100 commits", () => {
    const analytics = buildAnalyticsFixture({
      commitStats: {
        totalCommits: 100,
        averageCommitsPerDay: 0,
        averageCommitsPerWeek: 0,
        averageCommitsPerMonth: 0,
        activeDays: 50
      }
    });
    const types = typesOf(analytics);
    expect(types).toContain("century_club");
    expect(types).not.toContain("marathon");
  });

  it("otorga ambos century_club y marathon a partir de 1000 commits", () => {
    const analytics = buildAnalyticsFixture({
      commitStats: {
        totalCommits: 1000,
        averageCommitsPerDay: 0,
        averageCommitsPerWeek: 0,
        averageCommitsPerMonth: 0,
        activeDays: 200
      }
    });
    const types = typesOf(analytics);
    expect(types).toContain("century_club");
    expect(types).toContain("marathon");
  });
});

describe("catálogo de badges", () => {
  it("cada BadgeType tiene metadata (label + description)", () => {
    for (const type of BADGE_TYPES) {
      expect(BADGE_INFO[type].label.length).toBeGreaterThan(0);
      expect(BADGE_INFO[type].description.length).toBeGreaterThan(0);
    }
  });

  it("con datos completamente neutros no se otorga ningún badge", () => {
    expect(detectEligibleBadges(buildAnalyticsFixture())).toHaveLength(0);
  });
});

describe("getBadgeInfo (Fase 9 — locale-aware)", () => {
  it("devuelve label/description en español por defecto (BADGE_INFO)", () => {
    expect(getBadgeInfo("streak_30", "es")).toEqual(BADGE_INFO.streak_30);
  });

  it("devuelve el mismo catálogo en inglés para cada BadgeType", () => {
    for (const type of BADGE_TYPES) {
      const info = getBadgeInfo(type, "en");
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
    }
  });

  it("es y en dan textos distintos para el mismo badge", () => {
    expect(getBadgeInfo("streak_7", "es").label).not.toBe(getBadgeInfo("streak_7", "en").label);
  });
});

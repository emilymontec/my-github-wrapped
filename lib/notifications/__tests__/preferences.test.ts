import { describe, expect, it, vi, beforeEach } from "vitest";

const findUniqueMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notificationPreference: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      upsert: (...args: unknown[]) => upsertMock(...args)
    }
  }
}));

import { getNotificationPreferences, setNotificationPreferences } from "@/lib/notifications/preferences";

describe("getNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve los defaults (true/true/true) cuando no existe fila", async () => {
    findUniqueMock.mockResolvedValue(null);

    const prefs = await getNotificationPreferences("u1");

    expect(prefs).toEqual({
      wrappedReadyEmail: true,
      streakMilestoneEmail: true,
      comparisonInviteEmail: true
    });
  });

  it("devuelve los valores guardados cuando la fila existe", async () => {
    findUniqueMock.mockResolvedValue({
      wrappedReadyEmail: false,
      streakMilestoneEmail: true,
      comparisonInviteEmail: false
    });

    const prefs = await getNotificationPreferences("u1");

    expect(prefs).toEqual({
      wrappedReadyEmail: false,
      streakMilestoneEmail: true,
      comparisonInviteEmail: false
    });
  });
});

describe("setNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hace upsert solo con los campos provistos, con defaults en el create", async () => {
    upsertMock.mockResolvedValue({
      wrappedReadyEmail: false,
      streakMilestoneEmail: true,
      comparisonInviteEmail: true
    });

    const result = await setNotificationPreferences("u1", { wrappedReadyEmail: false });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: {
        userId: "u1",
        wrappedReadyEmail: false,
        streakMilestoneEmail: true,
        comparisonInviteEmail: true
      },
      update: { wrappedReadyEmail: false },
      select: { wrappedReadyEmail: true, streakMilestoneEmail: true, comparisonInviteEmail: true }
    });
    expect(result).toEqual({
      wrappedReadyEmail: false,
      streakMilestoneEmail: true,
      comparisonInviteEmail: true
    });
  });

  it("no toca los otros campos si solo se actualiza uno", async () => {
    upsertMock.mockResolvedValue({
      wrappedReadyEmail: true,
      streakMilestoneEmail: false,
      comparisonInviteEmail: true
    });

    await setNotificationPreferences("u1", { wrappedReadyEmail: true });

    const call = upsertMock.mock.calls[0][0];
    expect(call.update).toEqual({ wrappedReadyEmail: true });
    expect(call.update.streakMilestoneEmail).toBeUndefined();
    expect(call.update.comparisonInviteEmail).toBeUndefined();
  });

  it("actualiza comparisonInviteEmail de forma independiente", async () => {
    upsertMock.mockResolvedValue({
      wrappedReadyEmail: true,
      streakMilestoneEmail: true,
      comparisonInviteEmail: false
    });

    await setNotificationPreferences("u1", { comparisonInviteEmail: false });

    const call = upsertMock.mock.calls[0][0];
    expect(call.update).toEqual({ comparisonInviteEmail: false });
    expect(call.create).toEqual({
      userId: "u1",
      wrappedReadyEmail: true,
      streakMilestoneEmail: true,
      comparisonInviteEmail: false
    });
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const notificationLogCreateMock = vi.fn();
const userFindUniqueMock = vi.fn();
const getNotificationPreferencesMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notificationLog: { create: (...args: unknown[]) => notificationLogCreateMock(...args) },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) }
  }
}));

vi.mock("@/lib/notifications/preferences", () => ({
  getNotificationPreferences: (...args: unknown[]) => getNotificationPreferencesMock(...args)
}));

vi.mock("@/lib/notifications/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args)
}));

import { notifyWrappedReady, notifyStreakMilestone } from "@/lib/notifications/service";

/** Simula la violación real de `@@unique([userId, type, key])` en Prisma. */
function uniqueConstraintError() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

describe("notifyWrappedReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationPreferencesMock.mockResolvedValue({
      wrappedReadyEmail: true,
      streakMilestoneEmail: true
    });
    notificationLogCreateMock.mockResolvedValue({});
    userFindUniqueMock.mockResolvedValue({
      email: "user@example.com",
      username: "emily",
      name: null
    });
    sendEmailMock.mockResolvedValue({ sent: true });
  });

  it("no envía ni reclama el log si la preferencia está desactivada", async () => {
    getNotificationPreferencesMock.mockResolvedValue({
      wrappedReadyEmail: false,
      streakMilestoneEmail: true
    });

    const result = await notifyWrappedReady("u1", 2026);

    expect(result).toEqual({ sent: false, reason: "preference_disabled" });
    expect(notificationLogCreateMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("no reenvía si ya existe un NotificationLog para este año (P2002)", async () => {
    notificationLogCreateMock.mockRejectedValue(uniqueConstraintError());

    const result = await notifyWrappedReady("u1", 2026);

    expect(result).toEqual({ sent: false, reason: "already_sent" });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("propaga errores de DB que no son P2002", async () => {
    notificationLogCreateMock.mockRejectedValue(new Error("connection lost"));

    await expect(notifyWrappedReady("u1", 2026)).rejects.toThrow("connection lost");
  });

  it("devuelve no_email si el usuario no tiene email", async () => {
    userFindUniqueMock.mockResolvedValue({ email: null, username: "emily", name: null });

    const result = await notifyWrappedReady("u1", 2026);

    expect(result).toEqual({ sent: false, reason: "no_email" });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("reclama el log y envía el email con el contenido correcto", async () => {
    const result = await notifyWrappedReady("u1", 2026);

    expect(notificationLogCreateMock).toHaveBeenCalledWith({
      data: { userId: "u1", type: "wrapped_ready", key: "2026" }
    });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [to, content] = sendEmailMock.mock.calls[0];
    expect(to).toBe("user@example.com");
    expect(content.subject).toContain("2026");
    expect(result).toEqual({ sent: true });
  });

  it("usa el username como displayName, con fallback a name", async () => {
    userFindUniqueMock.mockResolvedValue({ email: "a@b.com", username: null, name: "Emily R" });

    await notifyWrappedReady("u1", 2026);

    const [, content] = sendEmailMock.mock.calls[0];
    expect(content.text).toContain("Hola Emily R");
  });

  it("usa el locale del usuario si es válido", async () => {
    userFindUniqueMock.mockResolvedValue({
      email: "a@b.com",
      username: "emily",
      name: null,
      locale: "en"
    });

    await notifyWrappedReady("u1", 2026);

    const [, content] = sendEmailMock.mock.calls[0];
    expect(content.subject).toBe("Your GitHub Wrapped 2026 is ready 🎉");
  });

  it("cae a español si el locale guardado no es válido", async () => {
    userFindUniqueMock.mockResolvedValue({
      email: "a@b.com",
      username: "emily",
      name: null,
      locale: "klingon"
    });

    await notifyWrappedReady("u1", 2026);

    const [, content] = sendEmailMock.mock.calls[0];
    expect(content.subject).toContain("ya está listo");
  });
});

describe("notifyStreakMilestone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationPreferencesMock.mockResolvedValue({
      wrappedReadyEmail: true,
      streakMilestoneEmail: true
    });
    notificationLogCreateMock.mockResolvedValue({});
    userFindUniqueMock.mockResolvedValue({
      email: "user@example.com",
      username: "emily",
      name: null
    });
    sendEmailMock.mockResolvedValue({ sent: true });
  });

  it("no envía si streakMilestoneEmail está desactivado", async () => {
    getNotificationPreferencesMock.mockResolvedValue({
      wrappedReadyEmail: true,
      streakMilestoneEmail: false
    });

    const result = await notifyStreakMilestone("u1", "streak_30", 30);

    expect(result).toEqual({ sent: false, reason: "preference_disabled" });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("deduplica por tipo de badge, no por streakLength", async () => {
    notificationLogCreateMock.mockRejectedValue(uniqueConstraintError());

    const result = await notifyStreakMilestone("u1", "streak_30", 30);

    expect(notificationLogCreateMock).toHaveBeenCalledWith({
      data: { userId: "u1", type: "streak_milestone", key: "streak_30" }
    });
    expect(result).toEqual({ sent: false, reason: "already_sent" });
  });

  it("envía el email con el badge correcto", async () => {
    const result = await notifyStreakMilestone("u1", "streak_100", 100);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [to, content] = sendEmailMock.mock.calls[0];
    expect(to).toBe("user@example.com");
    expect(content.subject).toContain("Racha de 100 días");
    expect(result).toEqual({ sent: true });
  });
});

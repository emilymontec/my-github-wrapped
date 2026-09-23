import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const comparisonInviteFindUniqueMock = vi.fn();
const comparisonInviteFindFirstMock = vi.fn();
const comparisonInviteCreateMock = vi.fn();
const comparisonInviteUpdateMock = vi.fn();
const comparisonLinkFindFirstMock = vi.fn();
const comparisonLinkUpdateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    comparisonInvite: {
      findUnique: (...args: unknown[]) => comparisonInviteFindUniqueMock(...args),
      findFirst: (...args: unknown[]) => comparisonInviteFindFirstMock(...args),
      create: (...args: unknown[]) => comparisonInviteCreateMock(...args),
      update: (...args: unknown[]) => comparisonInviteUpdateMock(...args)
    },
    comparisonLink: {
      findFirst: (...args: unknown[]) => comparisonLinkFindFirstMock(...args),
      update: (...args: unknown[]) => comparisonLinkUpdateMock(...args)
    },
    $transaction: (...args: unknown[]) => transactionMock(...args)
  }
}));

const createComparisonRequestForTargetIdMock = vi.fn();
vi.mock("@/lib/comparisons/service", () => ({
  createComparisonRequestForTargetId: (...args: unknown[]) => createComparisonRequestForTargetIdMock(...args)
}));

const notifyComparisonInviteMock = vi.fn();
vi.mock("@/lib/notifications/service", () => ({
  notifyComparisonInvite: (...args: unknown[]) => notifyComparisonInviteMock(...args)
}));

const sendEmailMock = vi.fn();
vi.mock("@/lib/notifications/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args)
}));

vi.mock("@/lib/notifications/templates", () => ({
  comparisonInviteEmail: vi.fn().mockReturnValue({ subject: "s", html: "<p>h</p>", text: "t" })
}));

import {
  createComparisonEmailInvite,
  getComparisonInvitePreview,
  acceptComparisonEmailInvite,
  declineComparisonEmailInvite
} from "@/lib/comparisons/invites";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createComparisonEmailInvite", () => {
  it("rechaza un email con formato inválido sin tocar la base", async () => {
    const result = await createComparisonEmailInvite("inviter-1", "no-es-un-email");

    expect(result).toEqual({ error: "invalid_email" });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("rechaza si el inviter todavía no tiene username", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ email: "me@example.com", username: null, locale: "es" });

    const result = await createComparisonEmailInvite("inviter-1", "target@example.com");

    expect(result).toEqual({ error: "inviter_incomplete" });
  });

  it("rechaza invitarse a uno mismo por email", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ email: "me@example.com", username: "emily", locale: "es" });

    const result = await createComparisonEmailInvite("inviter-1", "ME@EXAMPLE.COM");

    expect(result).toEqual({ error: "self" });
  });

  describe("cuando el email ya pertenece a un usuario existente", () => {
    beforeEach(() => {
      userFindUniqueMock.mockImplementation(({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return Promise.resolve({ email: "me@example.com", username: "emily", locale: "es" });
        if (where.email) return Promise.resolve({ id: "target-1" });
        return Promise.resolve(null);
      });
    });

    it("crea el ComparisonLink directo y notifica al destinatario (best-effort)", async () => {
      createComparisonRequestForTargetIdMock.mockResolvedValue({
        id: "link-1",
        createdAt: new Date("2026-01-01"),
        reused: false
      });
      notifyComparisonInviteMock.mockResolvedValue({ sent: true });

      const result = await createComparisonEmailInvite("inviter-1", "target@example.com");

      expect(result).toEqual({ kind: "existing_user", comparisonLinkId: "link-1" });
      expect(createComparisonRequestForTargetIdMock).toHaveBeenCalledWith("inviter-1", "target-1");
      expect(notifyComparisonInviteMock).toHaveBeenCalledWith({
        userId: "target-1",
        comparisonLinkId: "link-1",
        comparisonLinkCreatedAt: new Date("2026-01-01"),
        inviterUsername: "emily"
      });
      // Nunca se debe crear un ComparisonInvite -- el link real ya existe.
      expect(comparisonInviteCreateMock).not.toHaveBeenCalled();
    });

    it("no falla la invitación si notifyComparisonInvite rechaza (best-effort)", async () => {
      createComparisonRequestForTargetIdMock.mockResolvedValue({
        id: "link-1",
        createdAt: new Date(),
        reused: false
      });
      notifyComparisonInviteMock.mockRejectedValue(new Error("mailjet caído"));

      const result = await createComparisonEmailInvite("inviter-1", "target@example.com");

      expect(result).toEqual({ kind: "existing_user", comparisonLinkId: "link-1" });
    });

    it("propaga el error si ya existe una comparación con ese usuario", async () => {
      createComparisonRequestForTargetIdMock.mockResolvedValue({ error: "already_exists" });

      const result = await createComparisonEmailInvite("inviter-1", "target@example.com");

      expect(result).toEqual({ error: "already_exists" });
      expect(notifyComparisonInviteMock).not.toHaveBeenCalled();
    });
  });

  describe("cuando el email no pertenece a nadie todavía", () => {
    beforeEach(() => {
      userFindUniqueMock.mockImplementation(({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return Promise.resolve({ email: "me@example.com", username: "emily", locale: "es" });
        if (where.email) return Promise.resolve(null);
        return Promise.resolve(null);
      });
    });

    it("reusa una invitación pendiente y vigente en vez de crear otra", async () => {
      comparisonInviteFindFirstMock.mockResolvedValue({
        token: "existing-token",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60)
      });

      const result = await createComparisonEmailInvite("inviter-1", "nuevo@example.com");

      expect(result).toEqual({ kind: "pending_invite", token: "existing-token", emailSent: true });
      expect(comparisonInviteCreateMock).not.toHaveBeenCalled();
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("crea una invitación nueva y manda el email cuando no hay una vigente", async () => {
      comparisonInviteFindFirstMock.mockResolvedValue(null);
      comparisonInviteCreateMock.mockResolvedValue({ token: "nuevo-token" });
      sendEmailMock.mockResolvedValue({ sent: true });

      const result = await createComparisonEmailInvite("inviter-1", "nuevo@example.com");

      expect(result).toEqual({ kind: "pending_invite", token: "nuevo-token", emailSent: true });
      expect(comparisonInviteCreateMock).toHaveBeenCalledTimes(1);
      expect(sendEmailMock).toHaveBeenCalledWith("nuevo@example.com", expect.any(Object));
    });

    it("ignora una invitación pendiente si ya venció (crea una nueva)", async () => {
      comparisonInviteFindFirstMock.mockResolvedValue({
        token: "viejo-token",
        expiresAt: new Date(Date.now() - 1000)
      });
      comparisonInviteCreateMock.mockResolvedValue({ token: "nuevo-token" });
      sendEmailMock.mockResolvedValue({ sent: true });

      const result = await createComparisonEmailInvite("inviter-1", "nuevo@example.com");

      expect(result).toEqual({ kind: "pending_invite", token: "nuevo-token", emailSent: true });
    });

    it("devuelve emailSent:false si Mailjet no pudo mandar el email, sin revertir la fila", async () => {
      comparisonInviteFindFirstMock.mockResolvedValue(null);
      comparisonInviteCreateMock.mockResolvedValue({ token: "nuevo-token" });
      sendEmailMock.mockResolvedValue({ sent: false, reason: "provider_error" });

      const result = await createComparisonEmailInvite("inviter-1", "nuevo@example.com");

      expect(result).toEqual({ kind: "pending_invite", token: "nuevo-token", emailSent: false });
    });
  });
});

describe("getComparisonInvitePreview", () => {
  it("devuelve null si no existe el token", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue(null);

    expect(await getComparisonInvitePreview("nope")).toBeNull();
  });

  it("devuelve null si el inviter no tiene username (defensivo)", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      inviteeEmail: "x@example.com",
      inviter: { username: null }
    });

    expect(await getComparisonInvitePreview("t")).toBeNull();
  });

  it("recalcula el status como EXPIRED si venció, sin importar el status guardado", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
      inviteeEmail: "x@example.com",
      inviter: { username: "emily" }
    });

    const result = await getComparisonInvitePreview("t");

    expect(result).toEqual({ status: "EXPIRED", inviterUsername: "emily", inviteeEmail: "x@example.com" });
  });

  it("devuelve el status guardado tal cual cuando no está vencido", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      status: "ACCEPTED",
      expiresAt: new Date(Date.now() + 10000),
      inviteeEmail: "x@example.com",
      inviter: { username: "emily" }
    });

    const result = await getComparisonInvitePreview("t");

    expect(result?.status).toBe("ACCEPTED");
  });
});

describe("acceptComparisonEmailInvite", () => {
  it("devuelve not_found si el token no existe", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue(null);

    expect(await acceptComparisonEmailInvite("t", "user-1")).toEqual({ error: "not_found" });
  });

  it("devuelve already_resolved si el invite no está PENDING", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({ id: "inv-1", status: "DECLINED" });

    expect(await acceptComparisonEmailInvite("t", "user-1")).toEqual({ error: "already_resolved" });
  });

  it("marca EXPIRED y devuelve error expired si venció", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
      inviterUserId: "inviter-1"
    });

    const result = await acceptComparisonEmailInvite("t", "user-1");

    expect(result).toEqual({ error: "expired" });
    expect(comparisonInviteUpdateMock).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "EXPIRED" }
    });
  });

  it("rechaza aceptar tu propia invitación", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      inviterUserId: "same-user"
    });

    expect(await acceptComparisonEmailInvite("t", "same-user")).toEqual({ error: "self" });
  });

  it("crea el ComparisonLink en ACCEPTED de una y resuelve el invite (camino feliz)", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      inviterUserId: "inviter-1"
    });
    createComparisonRequestForTargetIdMock.mockResolvedValue({ id: "link-1", createdAt: new Date(), reused: false });
    transactionMock.mockResolvedValue([{}, {}]);

    const result = await acceptComparisonEmailInvite("t", "user-1");

    expect(result).toEqual({ comparisonLinkId: "link-1" });
    expect(createComparisonRequestForTargetIdMock).toHaveBeenCalledWith("inviter-1", "user-1");
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("si ya existía un ComparisonLink (already_exists), lo marca ACCEPTED y resuelve el invite igual", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      inviterUserId: "inviter-1"
    });
    createComparisonRequestForTargetIdMock.mockResolvedValue({ error: "already_exists" });
    comparisonLinkFindFirstMock.mockResolvedValue({ id: "link-existente" });
    transactionMock.mockResolvedValue([{}, {}]);

    const result = await acceptComparisonEmailInvite("t", "user-1");

    expect(result).toEqual({ comparisonLinkId: "link-existente" });
  });

  it("devuelve already_resolved si already_exists pero no se encuentra el link (caso de carrera)", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 10000),
      inviterUserId: "inviter-1"
    });
    createComparisonRequestForTargetIdMock.mockResolvedValue({ error: "already_exists" });
    comparisonLinkFindFirstMock.mockResolvedValue(null);

    expect(await acceptComparisonEmailInvite("t", "user-1")).toEqual({ error: "already_resolved" });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("declineComparisonEmailInvite", () => {
  it("devuelve not_found si el token no existe", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue(null);

    expect(await declineComparisonEmailInvite("t")).toEqual({ error: "not_found" });
  });

  it("devuelve already_resolved si ya no está PENDING", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({ id: "inv-1", status: "ACCEPTED" });

    expect(await declineComparisonEmailInvite("t")).toEqual({ error: "already_resolved" });
  });

  it("marca DECLINED y devuelve ok", async () => {
    comparisonInviteFindUniqueMock.mockResolvedValue({ id: "inv-1", status: "PENDING" });

    const result = await declineComparisonEmailInvite("t");

    expect(result).toEqual({ ok: true });
    expect(comparisonInviteUpdateMock).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "DECLINED" }
    });
  });
});

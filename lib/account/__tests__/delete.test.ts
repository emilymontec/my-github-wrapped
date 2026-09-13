import { describe, expect, it, vi, beforeEach } from "vitest";

const transactionMock = vi.fn();
const aiUsageLogDeleteManyMock = vi.fn();
const userDeleteMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
    aiUsageLog: { deleteMany: (...args: unknown[]) => aiUsageLogDeleteManyMock(...args) },
    user: { delete: (...args: unknown[]) => userDeleteMock(...args) }
  }
}));

import { deleteAccount } from "@/lib/account/delete";

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockResolvedValue([undefined, undefined]);
  });

  it("borra AiUsageLog y User en una sola transacción", async () => {
    await deleteAccount("u1");

    expect(transactionMock).toHaveBeenCalledTimes(1);
    const operations = transactionMock.mock.calls[0][0];
    expect(operations).toHaveLength(2);
  });

  it("filtra AiUsageLog por el userId correcto (tabla sin FK a User)", async () => {
    await deleteAccount("u1");

    expect(aiUsageLogDeleteManyMock).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("borra el User correcto (el resto cascade vía onDelete: Cascade)", async () => {
    await deleteAccount("u1");

    expect(userDeleteMock).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("propaga el error si la transacción falla (no deja la cuenta a medio borrar)", async () => {
    transactionMock.mockRejectedValue(new Error("db down"));

    await expect(deleteAccount("u1")).rejects.toThrow("db down");
  });
});

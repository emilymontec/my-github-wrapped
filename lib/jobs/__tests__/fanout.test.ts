import { describe, expect, it } from "vitest";
import { buildCursorPageArgs, isLastPage, FANOUT_PAGE_SIZE } from "@/lib/jobs/fanout";

describe("buildCursorPageArgs", () => {
  it("primera página (cursor null): solo 'take', sin cursor ni skip", () => {
    const args = buildCursorPageArgs("userId", null, 500);
    expect(args).toEqual({ take: 500 });
    expect(args).not.toHaveProperty("cursor");
    expect(args).not.toHaveProperty("skip");
  });

  it("páginas siguientes: incluye cursor con el campo correcto y skip: 1", () => {
    const args = buildCursorPageArgs("userId", "clx123", 500);
    expect(args).toEqual({ take: 500, cursor: { userId: "clx123" }, skip: 1 });
  });

  it("skip siempre es 1, nunca 0 -- evita duplicar el último ítem de la página anterior", () => {
    const args = buildCursorPageArgs("id", "abc", 100);
    expect(args.skip).toBe(1);
  });

  it("usa el nombre de campo de cursor que se le pasa (soporta distintos modelos)", () => {
    const byUserId = buildCursorPageArgs("userId", "x", 10);
    const byId = buildCursorPageArgs("id", "x", 10);
    expect(byUserId.cursor).toEqual({ userId: "x" });
    expect(byId.cursor).toEqual({ id: "x" });
  });

  it("respeta el pageSize pasado, no un valor fijo interno", () => {
    expect(buildCursorPageArgs("id", null, 42).take).toBe(42);
  });
});

describe("isLastPage", () => {
  it("es la última página cuando trae menos de lo pedido", () => {
    expect(isLastPage(3, FANOUT_PAGE_SIZE)).toBe(true);
    expect(isLastPage(0, FANOUT_PAGE_SIZE)).toBe(true);
  });

  it("NO es la última página cuando trae exactamente el tamaño de página", () => {
    expect(isLastPage(FANOUT_PAGE_SIZE, FANOUT_PAGE_SIZE)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { formatBRL } from "@/utils/formatBRL";

describe("formatBRL", () => {
  it("formats values with Brazilian currency rules", () => {
    expect(formatBRL(3650)).toMatch(/R\$\s*3\.650,00/);
    expect(formatBRL(Number.NaN)).toMatch(/R\$\s*0,00/);
  });
});

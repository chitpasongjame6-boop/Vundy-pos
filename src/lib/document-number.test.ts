import { describe, expect, it } from "vitest";
import {
  buildClosingNumber,
  buildReadableNumber,
  formatDateInput,
  getDayRange
} from "./document-number";

describe("document numbers", () => {
  const date = new Date(2026, 9, 11, 14, 30);

  it("creates stable daily sequence numbers", () => {
    expect(buildReadableNumber("POS", date, 7)).toBe("POS-20261011-007");
    expect(buildClosingNumber(date)).toBe("CLS-20261011");
  });

  it("formats and bounds a local calendar day", () => {
    expect(formatDateInput(date)).toBe("2026-10-11");

    const range = getDayRange("2026-10-11");
    expect(range.date).toBe("2026-10-11");
    expect(range.end.getTime() - range.start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

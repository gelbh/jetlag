import { describe, expect, it } from "vitest";
import { questionCostLabel } from "./questionRules";

describe("questionRules", () => {
  it("scales card costs by reuse count", () => {
    expect(questionCostLabel("D3P1", 0)).toBe("D3P1");
    expect(questionCostLabel("D3P1", 1)).toBe("D6P2");
    expect(questionCostLabel("D2P1", 1)).toBe("D4P2");
    expect(questionCostLabel("D4P2", 2)).toBe("D12P6");
  });
});

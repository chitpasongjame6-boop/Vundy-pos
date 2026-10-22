import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async importOriginal => ({ ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (next: unknown) => { hooks.values[index] = next; }];
  }
}));
import { PurchaseCostFields } from "./purchase-cost-fields";

type Props = { name?: string; value?: unknown; children?: ReactNode; type?: string; onChange?: (event: { target: { value: string } }) => void };
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as ReactElement<Props>;
  return [element, ...nodes(element.props.children)];
}
function render(prefix: "variant" | "purchase" = "variant") {
  hooks.cursor = 0;
  return nodes(PurchaseCostFields({ prefix, defaultRate: 6500000 }));
}
function field(tree: ReturnType<typeof render>, name: string) {
  const matches = tree.filter(node => node.props.name === name);
  expect(matches).toHaveLength(1);
  return matches[0].props;
}

describe("purchase currency form", () => {
  beforeEach(() => { hooks.values = []; hooks.cursor = 0; });
  it.each(["variant", "purchase"] as const)("submits raw baht and previews kip without dropping decimal places (%s)", prefix => {
    field(render(prefix), `${prefix}CostCurrency`).onChange!({ target: { value: "THB" } });
    field(render(prefix), `${prefix}CostAmount`).onChange!({ target: { value: "200.50" } });
    const tree = render(prefix);
    expect(field(tree, `${prefix}CostAmount`).value).toBe("200.50");
    expect(field(tree, `${prefix}CostRate`).value).toBe("650");
    expect(field(tree, prefix === "variant" ? "variantCostPrice" : "unitCost").value).toBe(130325);
    field(tree, `${prefix}CostCurrency`).onChange!({ target: { value: "LAK" } });
    expect(field(render(prefix), `${prefix}CostAmount`).value).toBe(0);
  });
  it("does not produce a misleading kip amount when a rate or decimal is invalid", () => {
    field(render(), "variantCostCurrency").onChange!({ target: { value: "THB" } });
    field(render(), "variantCostAmount").onChange!({ target: { value: "200.555" } });
    expect(field(render(), "variantCostPrice").value).toBe("");
    field(render(), "variantCostAmount").onChange!({ target: { value: "200" } });
    field(render(), "variantCostRate").onChange!({ target: { value: "0" } });
    expect(field(render(), "variantCostPrice").value).toBe("");
  });
});

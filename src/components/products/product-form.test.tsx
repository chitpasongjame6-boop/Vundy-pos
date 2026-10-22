import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "./product-form";
import { listenForBarcodeScan } from "@/lib/barcode-scanner";

const state = vi.hoisted(() => ({
  fields: [] as Array<{ value: string; dispatchEvent: ReturnType<typeof vi.fn>; focus: ReturnType<typeof vi.fn> }>,
  effects: [] as Array<() => void | (() => void)>,
  setState: vi.fn(), action: vi.fn(), cleanup: vi.fn(), pending: false, lookup: vi.fn()
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useActionState: () => [{ ok: null, message: "" }, state.action, state.pending],
  useState: (initial: unknown) => [initial, state.setState],
  useEffectEvent: (callback: unknown) => callback,
  useRef: () => ({ current: { querySelectorAll: () => state.fields } }),
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); }
}));
vi.mock("@/actions/product.action", () => ({ submitCreateProduct: vi.fn() }));
vi.mock("./use-product-catalog", () => ({ useProductCatalog: () => ({
  result: null, loading: false, useImage: false, setUseImage: vi.fn(), reset: vi.fn(), lookup: state.lookup
}) }));
vi.mock("@/lib/barcode-scanner", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/barcode-scanner")>(),
  listenForBarcodeScan: vi.fn(() => state.cleanup)
}));

function field(value = "") {
  return { value, dispatchEvent: vi.fn(), focus: vi.fn() };
}
function mountForm() {
  const tree = ProductForm({ categories: ["Perfume"] });
  const cleanup = state.effects[0]();
  return { tree, cleanup, scan: vi.mocked(listenForBarcodeScan).mock.calls[0]?.[0] };
}

describe("product form scan integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.effects = [];
    state.fields = [field()];
    state.pending = false;
  });

  it("fills SKU immediately without focusing or submitting the form", () => {
    const { scan, cleanup } = mountForm();
    scan("0012345678901");
    expect(state.fields[0].value).toBe("0012345678901");
    expect(state.fields[0].dispatchEvent).toHaveBeenCalledOnce();
    expect(state.fields[0].focus).not.toHaveBeenCalled();
    expect(state.action).not.toHaveBeenCalled();
    expect(state.lookup).toHaveBeenCalledOnce();
    expect(state.setState).toHaveBeenCalledWith(expect.stringContaining("0012345678901"));
    cleanup?.();
    expect(state.cleanup).toHaveBeenCalledOnce();
  });

  it("reads current visible rows after adding or removing a size", () => {
    const { scan } = mountForm();
    state.fields = [field("SIZE-10"), field(), field("SIZE-100")];
    scan("SIZE-20");
    expect(state.fields.map(item => item.value)).toEqual(["SIZE-10", "SIZE-20", "SIZE-100"]);
    expect(state.lookup).not.toHaveBeenCalled();
    state.fields = [field()];
    scan("SINGLE");
    expect(state.fields[0].value).toBe("SINGLE");
  });

  it("does not overwrite existing values or put a duplicate in another row", () => {
    const { scan } = mountForm();
    scan("001234");
    scan("009999");
    expect(state.fields[0].value).toBe("001234");
    state.fields.push(field());
    scan("001234");
    expect(state.fields.map(item => item.value)).toEqual(["001234", ""]);
    expect(state.action).not.toHaveBeenCalled();
  });

  it("does not register a scanner while saving", () => {
    state.pending = true;
    mountForm();
    expect(listenForBarcodeScan).not.toHaveBeenCalled();
  });

  it("prevents Enter in a directly edited SKU from submitting, without intercepting ordinary keys", () => {
    const { tree } = mountForm();
    const skuProps: Array<{ onKeyDown: (event: unknown) => void }> = [];
    function visit(node: ReactNode) {
      Children.forEach(node, child => {
        if (!isValidElement<{ name?: string; children?: ReactNode; onKeyDown: (event: unknown) => void }>(child)) return;
        if (child.props.name === "variantSku") skuProps.push(child.props);
        visit(child.props.children);
      });
    }
    visit(tree);
    expect(skuProps).toHaveLength(1);
    const preventDefault = vi.fn();
    skuProps[0].onKeyDown({ key: "Enter", nativeEvent: { isComposing: false }, preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    preventDefault.mockClear();
    for (const key of ["1", "Tab", "Backspace"]) {
      skuProps[0].onKeyDown({ key, nativeEvent: { isComposing: false }, preventDefault });
    }
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

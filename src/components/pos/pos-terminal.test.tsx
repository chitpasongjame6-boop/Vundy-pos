import { Children, isValidElement, type ChangeEvent, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PosTerminal } from "./pos-terminal";
import { Input } from "@/components/ui/input";
import { listenForBarcodeScan } from "@/lib/barcode-scanner";
import { createPosSale } from "@/actions/pos.action";
import { defaultStoreSettings } from "@/lib/local-store";
import type { Product, Promotion } from "@/types";

// Keep hook state across shallow renders so scans exercise the real POS
// handlers, functional cart updates and latest-render Effect Event callback.
const hooks = vi.hoisted(() => ({
  values: [] as unknown[], refs: [] as Array<{ current: unknown }>,
  stateIndex: 0, refIndex: 0, pending: false,
  effects: [] as Array<{ run: () => void | (() => void); deps: unknown[] }>,
  scanEvent: null as null | ((barcode: string) => void), cleanup: vi.fn()
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState(initial: unknown) {
    const index = hooks.stateIndex++;
    if (index >= hooks.values.length) hooks.values.push(typeof initial === "function" ? initial() : initial);
    return [hooks.values[index], (update: unknown) => {
      hooks.values[index] = typeof update === "function" ? update(hooks.values[index]) : update;
    }];
  },
  useRef(initial: unknown) {
    const index = hooks.refIndex++;
    if (index >= hooks.refs.length) hooks.refs.push({ current: initial });
    return hooks.refs[index];
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useTransition: () => [hooks.pending, vi.fn()],
  useEffect: (run: () => void | (() => void), deps: unknown[]) => { hooks.effects.push({ run, deps }); },
  useEffectEvent: (callback: (barcode: string) => void) => {
    hooks.scanEvent = callback;
    return (barcode: string) => hooks.scanEvent?.(barcode);
  }
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/pos.action", () => ({ createPosSale: vi.fn() }));
vi.mock("@/actions/promotion.action", () => ({ getPosPromotions: vi.fn() }));
vi.mock("@/lib/barcode-scanner", () => ({ listenForBarcodeScan: vi.fn(() => hooks.cleanup) }));

const now = new Date("2026-10-22T03:00:00Z");
const product: Product = {
  id: "perfume", name: "Perfume", sku: "VL-10", category: "Perfume", costPrice: 100000,
  sellPrice: 250000, stock: 2, lowStockAlert: 1, isActive: true, createdAt: now, updatedAt: now,
  variants: [
    { id: "10ml", name: "10 ml", sku: "VL-10", costPrice: 100000, sellPrice: 250000, stock: 2, lowStockAlert: 1 },
    { id: "100ml", name: "100 ml", sku: "VL-100", costPrice: 500000, sellPrice: 1000000, stock: 3, lowStockAlert: 1 }
  ]
};
const promotion: Promotion = {
  id: "promo", name: "Sale", kind: "PERCENT", value: 10, targets: [{ productId: "perfume", variantId: "10ml" }],
  startsAt: now, endsAt: new Date(now.getTime() + 3600000), isActive: true, createdAt: now, updatedAt: now
};
type Props = ComponentProps<typeof PosTerminal>;
function render(overrides: Partial<Props> = {}) {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  hooks.effects = [];
  return PosTerminal({
    products: [product], members: [], userRole: "STAFF", storeSettings: defaultStoreSettings,
    initialPricing: { promotions: [promotion], serverNow: now.getTime() }, ...overrides
  });
}
function mount(overrides: Partial<Props> = {}) {
  const tree = render(overrides);
  // The first effect refreshes prices; the second installs the scanner.
  const cleanup = hooks.effects[1].run();
  const scan = vi.mocked(listenForBarcodeScan).mock.calls[0]?.[0];
  return { tree, scan, cleanup };
}
function cart() {
  return hooks.values.find(Array.isArray) as Array<{ sku: string; quantity: number; price: number; variantId: string }>;
}
function barcodeInput(tree: ReactNode) {
  const inputs: Array<ComponentProps<typeof Input>> = [];
  function visit(node: ReactNode) {
    Children.forEach(node, child => {
      if (!isValidElement<ComponentProps<typeof Input>>(child)) return;
      if (child.type === Input && child.props.placeholder?.includes("SKU")) inputs.push(child.props);
      visit(child.props.children);
    });
  }
  visit(tree);
  expect(inputs).toHaveLength(1);
  return inputs[0];
}
function enter(value: string, key = "Enter") {
  return { key, currentTarget: { value }, nativeEvent: { isComposing: false }, preventDefault: vi.fn() };
}

describe("POS barcode integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.values = [];
    hooks.refs = [];
    hooks.pending = false;
  });

  it.each(["OWNER", "STAFF"] as const)("adds by page-wide scan for %s without submitting a sale", (userRole) => {
    const { scan, cleanup } = mount({ userRole });
    scan("vl-10");
    expect(cart()).toMatchObject([{ sku: "VL-10", quantity: 1, variantId: "10ml", price: 225000 }]);
    expect(createPosSale).not.toHaveBeenCalled();
    cleanup?.();
    expect(hooks.cleanup).toHaveBeenCalledOnce();
  });

  it("counts every complete repeated scan exactly once and respects stock", () => {
    const { scan } = mount();
    scan("VL-10");
    scan("VL-10");
    expect(cart()).toMatchObject([{ quantity: 2 }]);
    scan("VL-10");
    expect(cart()).toMatchObject([{ quantity: 2 }]);
    expect(hooks.values).toContain("ສະຕ໋ອກສິນຄ້າບໍ່ພໍ");
  });

  it("matches the full SKU and correct size, not another SKU's prefix", () => {
    const { scan } = mount();
    scan("VL-100");
    expect(cart()).toMatchObject([{ sku: "VL-100", variantId: "100ml", price: 1000000, quantity: 1 }]);
  });

  it("keeps the cart unchanged for an unknown barcode", () => {
    const { scan } = mount();
    scan("UNKNOWN");
    expect(cart()).toEqual([]);
    expect(hooks.values).toContain("ບໍ່ພົບ SKU / Barcode ນີ້");
  });

  it("uses current product stock after re-rendering without reconnecting the scanner", () => {
    const { scan } = mount();
    render({ products: [{ ...product, variants: product.variants!.map(item => ({ ...item, stock: 0 })) }] });
    scan("VL-10");
    expect(cart()).toEqual([]);
    expect(listenForBarcodeScan).toHaveBeenCalledOnce();
    expect(hooks.effects[1].deps).toEqual([false]);
  });

  it("pauses scanning while a sale is being saved", () => {
    const { scan } = mount();
    hooks.pending = true;
    render();
    expect(hooks.effects[1].run()).toBeUndefined();
    scan("VL-10");
    expect(cart()).toEqual([]);
    expect(barcodeInput(render()).disabled).toBe(true);
    expect(listenForBarcodeScan).toHaveBeenCalledOnce();
  });

  it.each(["Enter", "Tab"])("waits for %s in the focused input and ignores a repeated suffix", (suffix) => {
    const { tree, scan } = mount();
    const input = barcodeInput(tree);
    for (const value of ["V", "VL", "VL-", "VL-1", "VL-10", "VL-100"]) {
      input.onChange?.({ target: { value } } as ChangeEvent<HTMLInputElement>);
    }
    expect(cart()).toEqual([]);
    const event = enter("VL-100", suffix);
    input.onKeyDown?.(event as unknown as KeyboardEvent<HTMLInputElement>);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.currentTarget.value).toBe("");
    input.onKeyDown?.(event as unknown as KeyboardEvent<HTMLInputElement>);
    expect(cart()).toMatchObject([{ sku: "VL-100", quantity: 1 }]);
    // Switching back to page-wide scanning must not skip the next same SKU.
    scan("VL-100");
    expect(cart()).toMatchObject([{ sku: "VL-100", quantity: 2 }]);
  });

  it("preserves empty-field Tab navigation and IME composition", () => {
    const input = barcodeInput(mount().tree);
    const tab = enter("", "Tab");
    input.onKeyDown?.(tab as unknown as KeyboardEvent<HTMLInputElement>);
    expect(tab.preventDefault).not.toHaveBeenCalled();
    const composing = enter("VL-10");
    composing.nativeEvent.isComposing = true;
    input.onKeyDown?.(composing as unknown as KeyboardEvent<HTMLInputElement>);
    expect(composing.preventDefault).not.toHaveBeenCalled();
    expect(cart()).toEqual([]);
  });
});

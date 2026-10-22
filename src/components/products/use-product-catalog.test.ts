import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/product-catalog";
import { clearCatalogFields, fillCatalogFields, useProductCatalog } from "./use-product-catalog";

const hooks = vi.hoisted(() => ({ states: [] as unknown[], refs: [] as { current: unknown }[], stateIndex: 0, refIndex: 0, effects: [] as (() => void)[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.stateIndex++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [hooks.states[index], (value: unknown) => { hooks.states[index] = typeof value === "function" ? value(hooks.states[index]) : value; }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    return hooks.refs[index] ?? (hooks.refs[index] = { current: initial });
  },
  useEffect: (effect: () => () => void) => { if (!hooks.effects.length) hooks.effects.push(effect()); }
}));

const product: CatalogProduct = { barcode: "3017624010701", name: "Cream", brand: "Example", quantity: "100 ml", category: "Cosmetics", imageUrl: "https://images.openbeautyfacts.org/images/products/301/762/401/0701/front_en.1.400.jpg", provider: "beauty", sourceUrl: "https://world.openbeautyfacts.org/product/3017624010701", retrievedAt: "2026-10-22T00:00:00Z" };
const node = (value = "") => ({ value, dataset: {} as Record<string, string>, files: [] as File[] });
function formFixture() {
  const fields: Record<string, ReturnType<typeof node>> = {
    name: node(), category: node(), variantName: node("ມາດຕະຖານ"), variantSku: node(product.barcode), productImage: node(),
    variantCostAmount: node("250"), variantCostCurrency: node("THB"), variantStock: node("5"), variantSellPrice: node("300000"), variantExpiryDate: node("2027-01-01")
  };
  const form = {
    querySelector: (selector: string) => fields[selector.match(/name="(\w+)"/)?.[1] ?? ""] ?? null,
    querySelectorAll: () => Object.values(fields).filter(field => field.dataset.catalogValue !== undefined)
  } as unknown as HTMLFormElement;
  return { fields, ref: { current: form as HTMLFormElement | null }, form };
}
function render(ref: { current: HTMLFormElement | null }) {
  hooks.stateIndex = 0; hooks.refIndex = 0;
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Isolated hook harness with persistent mocked hook slots.
  return useProductCatalog(ref);
}
const found = () => Response.json({ status: "found", product, token: "signed" });

describe("catalog form integration", () => {
  beforeEach(() => { hooks.states = []; hooks.refs = []; hooks.effects = []; vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => found())); });
  afterEach(() => { hooks.effects.forEach(cleanup => cleanup()); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("fills descriptions only and leaves all shop-specific fields unchanged", () => {
    const { fields, form } = formFixture();
    fillCatalogFields(form, product);
    expect(fields.name.value).toBe("Example Cream"); expect(fields.variantName.value).toBe("100 ml"); expect(fields.category.value).toBe("Cosmetics");
    expect(fields.variantCostAmount.value).toBe("250"); expect(fields.variantCostCurrency.value).toBe("THB");
    expect(fields.variantStock.value).toBe("5"); expect(fields.variantSellPrice.value).toBe("300000"); expect(fields.variantExpiryDate.value).toBe("2027-01-01");
  });

  it("does not overwrite entered text, touched empty fields or a decanted size", () => {
    const { fields, form } = formFixture();
    fields.name.value = "Shop name"; fields.category.dataset.catalogTouched = "true"; fields.variantName.value = "10 ml";
    fillCatalogFields(form, product);
    expect(fields.name.value).toBe("Shop name"); expect(fields.category.value).toBe(""); expect(fields.variantName.value).toBe("10 ml");
  });

  it("clears only unchanged imported values, preserving the user's edits", () => {
    const { fields, form } = formFixture();
    fillCatalogFields(form, product); fields.name.value = "My revised name"; fields.name.dataset.catalogTouched = "true";
    clearCatalogFields(form);
    expect(fields.name.value).toBe("My revised name"); expect(fields.category.value).toBe(""); expect(fields.variantName.value).toBe("ມາດຕະຖານ");
  });

  it("performs same-origin lookup, retains a signed snapshot and selects the remote image", async () => {
    const { fields, ref } = formFixture();
    await render(ref).lookup();
    const next = render(ref);
    expect(next.result).toMatchObject({ status: "found", token: "signed" }); expect(next.useImage).toBe(true); expect(next.loading).toBe(false);
    expect(fields.name.value).toBe("Example Cream");
    expect(fetch).toHaveBeenCalledWith(`/api/products/lookup?barcode=${product.barcode}`, expect.objectContaining({ credentials: "same-origin" }));
  });

  it("keeps the uploaded image when lookup completes", async () => {
    const { fields, ref } = formFixture(); fields.productImage.files = [new File(["own"], "own.jpg")];
    await render(ref).lookup(); expect(render(ref).useImage).toBe(false);
  });

  it("rejects a stale result if the barcode is edited or the first variant is removed", async () => {
    const { fields, ref } = formFixture(); let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = render(ref).lookup(); fields.variantSku.value = "12345678"; resolve(found()); await pending;
    expect(fields.name.value).toBe(""); expect(render(ref).result).toBeNull();
  });

  it("ignores a slower earlier lookup after a second scan", async () => {
    const { fields, ref } = formFixture(); let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const first = render(ref).lookup(); fields.variantSku.value = "12345678";
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: "not_found" }));
    await render(ref).lookup(); resolve(found()); await first;
    expect(render(ref).result).toEqual({ status: "not_found" }); expect(fields.name.value).toBe("");
  });

  it("protects edits made while waiting and can cancel without filling anything", async () => {
    const { fields, ref } = formFixture(); let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = render(ref).lookup(); fields.name.value = "Typing now"; resolve(found()); await pending;
    expect(fields.name.value).toBe("Typing now");
    render(ref).reset(); expect(render(ref).result).toBeNull(); expect(fields.name.value).toBe("Typing now");
  });

  it.each(["not_found", "unavailable", "rate_limited", "existing"])("keeps manual entry usable after %s", async status => {
    const { fields, ref } = formFixture(); fields.name.value = "Manual";
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status, retryAfter: 60, name: "Stored", barcode: product.barcode }));
    await render(ref).lookup(); expect(render(ref).result?.status).toBe(status); expect(render(ref).loading).toBe(false); expect(fields.name.value).toBe("Manual");
  });

  it("handles expired-session HTML and network failures without changing the form", async () => {
    const { fields, ref } = formFixture();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("login", { headers: { "Content-Type": "text/html" } }));
    await render(ref).lookup(); expect(render(ref).result).toEqual({ status: "unavailable" });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline")); await render(ref).lookup();
    expect(fields.name.value).toBe(""); expect(render(ref).loading).toBe(false);
  });
});

"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { catalogProductName, type CatalogProduct, type ProductLookupResponse } from "@/lib/product-catalog";

// No price, currency, stock or expiry is ever copied from the catalog.
export function fillCatalogFields(form: HTMLFormElement, product: CatalogProduct) {
  const values = { name: catalogProductName(product), category: product.category, variantName: product.quantity };
  for (const [name, value] of Object.entries(values)) {
    const field = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!field || !value || field.dataset.catalogTouched === "true") continue;
    if (field.value.trim() && !(name === "variantName" && field.value === "ມາດຕະຖານ")) continue;
    field.dataset.catalogPrevious = field.value;
    field.dataset.catalogValue = value;
    field.value = value;
  }
}

export function clearCatalogFields(form: HTMLFormElement | null) {
  form?.querySelectorAll<HTMLInputElement>("input[data-catalog-value]").forEach(field => {
    if (field.dataset.catalogTouched !== "true" && field.value === field.dataset.catalogValue) field.value = field.dataset.catalogPrevious ?? "";
    delete field.dataset.catalogValue;
    delete field.dataset.catalogPrevious;
  });
}

export function useProductCatalog(formRef: RefObject<HTMLFormElement | null>) {
  const [result, setResult] = useState<ProductLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [useImage, setUseImage] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  function reset() {
    request.current?.abort();
    request.current = null;
    clearCatalogFields(formRef.current);
    setResult(null); setLoading(false); setUseImage(false);
  }

  async function lookup() {
    const form = formRef.current;
    const field = form?.querySelector<HTMLInputElement>('input[name="variantSku"]');
    const barcode = field?.value.trim() ?? "";
    request.current?.abort();
    if (!form || !field || !barcode) {
      setResult({ status: "invalid" }); setLoading(false); return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`/api/products/lookup?barcode=${encodeURIComponent(barcode)}`, {
        cache: "no-store", credentials: "same-origin", signal: controller.signal
      });
      if (response.redirected || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Unexpected response");
      const data: ProductLookupResponse = await response.json();
      // Ignore stale responses after another scan, an edited/deleted row or unmount.
      if (controller.signal.aborted || request.current !== controller || formRef.current !== form ||
          form.querySelector('input[name="variantSku"]') !== field || field.value.trim() !== barcode) return;
      if (data.status === "found") {
        if (data.product.barcode !== barcode || !data.token) throw new Error("Unexpected product");
        fillCatalogFields(form, data.product);
        const file = form.querySelector<HTMLInputElement>('input[name="productImage"]');
        setUseImage(Boolean(data.product.imageUrl) && !file?.files?.length);
      }
      // A transient retry failure must not discard already imported attribution.
      setResult(current => data.status !== "found" && current?.status === "found" ? current : data);
    } catch {
      if (request.current === controller) setResult(current => current?.status === "found" ? current : { status: "unavailable" });
    } finally {
      clearTimeout(timer);
      if (request.current === controller) setLoading(false);
    }
  }
  return { result, loading, useImage, setUseImage, lookup, reset };
}

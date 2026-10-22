import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBarcodeBuffer, findBarcodeSlot, listenForBarcodeScan } from "./barcode-scanner";

function key(key: string, timeStamp: number, overrides = {}) {
  return { key, timeStamp, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, repeat: false, ...overrides };
}

describe("keyboard-wedge barcode buffer", () => {
  it.each(["Enter", "Tab"])("accepts fast scans ending in %s, preserving leading zeros", (suffix) => {
    const buffer = createBarcodeBuffer();
    [..."0012345678901"].forEach((character, index) => {
      expect(buffer.push(key(character, 1000 + index * 10))).toBeNull();
    });
    expect(buffer.push(key(suffix, 1130))).toBe("0012345678901");
    expect(buffer.push(key(suffix, 1140))).toBeNull();
  });

  it("accepts upper-case letters and punctuation with Shift", () => {
    const buffer = createBarcodeBuffer();
    ["Shift", "V", "Shift", "L", "-", "0", "1"].forEach((character, index) => buffer.push(key(character, index * 10)));
    expect(buffer.push(key("Enter", 70))).toBe("VL-01");
  });

  it("ignores slow manual typing and delayed suffixes", () => {
    const buffer = createBarcodeBuffer();
    [..."123456"].forEach((character, index) => buffer.push(key(character, index * 150)));
    expect(buffer.push(key("Enter", 760))).toBeNull();
    [..."987654"].forEach((character, index) => buffer.push(key(character, 1000 + index * 10)));
    expect(buffer.push(key("Enter", 2000))).toBeNull();
  });

  it.each(["1", "123", "x".repeat(129)])("ignores short or oversized bursts (%s)", (value) => {
    const buffer = createBarcodeBuffer();
    [...value].forEach((character, index) => buffer.push(key(character, index * 10)));
    expect(buffer.push(key("Enter", value.length * 10))).toBeNull();
  });

  it.each(["ctrlKey", "altKey", "metaKey", "isComposing", "repeat"])("does not treat %s as a scan", (flag) => {
    const buffer = createBarcodeBuffer();
    [..."123456"].forEach((character, index) => buffer.push(key(character, index * 10, { [flag]: true })));
    expect(buffer.push(key("Enter", 60))).toBeNull();
  });

  it("discards interrupted input and starts a new independent scan", () => {
    const buffer = createBarcodeBuffer();
    [..."12345"].forEach((character, index) => buffer.push(key(character, index * 10)));
    buffer.reset();
    expect(buffer.push(key("Enter", 50))).toBeNull();
    [..."98765"].forEach((character, index) => buffer.push(key(character, 1000 + index * 10)));
    expect(buffer.push(key("Enter", 1050))).toBe("98765");
  });
});

describe("variant barcode destination", () => {
  it("fills the first empty visible row without replacing existing SKUs", () => {
    expect(findBarcodeSlot([""], "001234")).toEqual({ kind: "empty", index: 0 });
    expect(findBarcodeSlot(["VL-1", " ", "VL-3"], "001234")).toEqual({ kind: "empty", index: 1 });
  });
  it("rejects duplicate scans, including case-insensitive duplicates", () => {
    expect(findBarcodeSlot(["VL-1", ""], "vl-1")).toEqual({ kind: "duplicate", index: 0 });
  });
  it("does not silently overwrite completed rows", () => {
    expect(findBarcodeSlot(["VL-1", "VL-2"], "VL-3")).toEqual({ kind: "full" });
    expect(findBarcodeSlot([], "VL-3")).toEqual({ kind: "full" });
  });
});

describe("page-wide scanner listener", () => {
  let target: EventTarget;
  let page: EventTarget;
  let cleanup: (() => void) | undefined;
  class EditableTarget {
    closest = vi.fn(() => this);
  }
  beforeEach(() => {
    target = new EventTarget();
    page = new EventTarget();
    vi.stubGlobal("window", target);
    vi.stubGlobal("document", page);
    vi.stubGlobal("Element", EditableTarget);
  });
  afterEach(() => { cleanup?.(); vi.unstubAllGlobals(); });

  function dispatch(character: string, time: number, editable = false) {
    const event = new Event("keydown", { cancelable: true });
    Object.defineProperties(event, Object.fromEntries(
      Object.entries(key(character, time)).map(([name, value]) => [name, { value }])
    ));
    if (editable) Object.defineProperty(event, "target", { value: new EditableTarget() });
    target.dispatchEvent(event);
    return event;
  }
  function burst(editable = false) {
    [..."001234"].forEach((character, index) => dispatch(character, index * 10, editable));
  }

  it("receives a scan without a focused input and consumes the suffix only", () => {
    const onScan = vi.fn();
    cleanup = listenForBarcodeScan(onScan);
    [..."001234"].forEach((character, index) => {
      expect(dispatch(character, index * 10).defaultPrevented).toBe(false);
    });
    expect(dispatch("Enter", 60).defaultPrevented).toBe(true);
    expect(onScan).toHaveBeenCalledExactlyOnceWith("001234");
  });
  it("consumes the extra Enter sent by CR+LF scanners, but not a later keypress", () => {
    const onScan = vi.fn();
    cleanup = listenForBarcodeScan(onScan);
    burst();
    expect(dispatch("Enter", 60).defaultPrevented).toBe(true);
    expect(dispatch("Enter", 70).defaultPrevented).toBe(true);
    expect(dispatch("Enter", 300).defaultPrevented).toBe(false);
    expect(onScan).toHaveBeenCalledExactlyOnceWith("001234");
  });
  it("leaves typing in other editable fields and normal Tab navigation untouched", () => {
    const onScan = vi.fn();
    cleanup = listenForBarcodeScan(onScan);
    burst(true);
    expect(dispatch("Enter", 60, true).defaultPrevented).toBe(false);
    expect(dispatch("Tab", 70).defaultPrevented).toBe(false);
    expect(onScan).not.toHaveBeenCalled();
  });
  it.each(["blur", "pointerdown", "focusin", "visibilitychange"])("resets partial scans on %s", (eventName) => {
    const onScan = vi.fn();
    cleanup = listenForBarcodeScan(onScan);
    burst();
    (eventName === "visibilitychange" ? page : target).dispatchEvent(new Event(eventName));
    expect(dispatch("Enter", 60).defaultPrevented).toBe(false);
    expect(onScan).not.toHaveBeenCalled();
  });
  it("removes listeners when leaving the page or while saving", () => {
    const onScan = vi.fn();
    cleanup = listenForBarcodeScan(onScan);
    cleanup();
    burst();
    expect(dispatch("Enter", 60).defaultPrevented).toBe(false);
    expect(onScan).not.toHaveBeenCalled();
  });
});

type ScanKey = Pick<KeyboardEvent,
  "key" | "timeStamp" | "ctrlKey" | "altKey" | "metaKey" | "isComposing" | "repeat"
>;

// USB/Bluetooth keyboard-wedge scanners send a quick burst followed by Enter
// or Tab. Require a terminator; never mistake an unfinished burst for a scan.
export function createBarcodeBuffer() {
  const maxGapMs = 80;
  const maxLength = 128;
  let value = "";
  let lastKeyAt = 0;
  let overflow = false;

  function reset() {
    value = "";
    lastKeyAt = 0;
    overflow = false;
  }

  return {
    reset,
    push(event: ScanKey): string | null {
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) {
        reset();
        return null;
      }
      // Shift is used by scanners for upper-case letters and punctuation.
      if (event.key === "Shift") return null;
      if (event.timeStamp - lastKeyAt > maxGapMs) reset();

      if (event.key === "Enter" || event.key === "Tab") {
        const barcode = !overflow && value.length >= 4 ? value : null;
        reset();
        return barcode;
      }
      if (event.key.length !== 1 || !/^[!-~]$/.test(event.key)) {
        reset();
        return null;
      }

      lastKeyAt = event.timeStamp;
      if (value.length === maxLength) overflow = true;
      if (!overflow) value += event.key;
      return null;
    }
  };
}

export function listenForBarcodeScan(onScan: (barcode: string) => void) {
  const buffer = createBarcodeBuffer();
  const capture = { capture: true };
  let lastScanAt: number | null = null;
  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target;
    // Leave typing, native selects, IME and other editors completely alone.
    if (event.defaultPrevented || (target instanceof Element && target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="spinbutton"], [role="dialog"]'
    ))) {
      reset();
      return;
    }
    // Some scanners send CR+LF (two Enter keys). Consume that extra suffix too.
    if (lastScanAt !== null && event.timeStamp - lastScanAt <= 100 &&
      (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    lastScanAt = null;
    const barcode = buffer.push(event);
    if (barcode !== null) {
      // A scanner suffix must not click a focused button, submit or Tab away.
      event.preventDefault();
      event.stopPropagation();
      lastScanAt = event.timeStamp;
      onScan(barcode);
    }
  }
  function reset() {
    buffer.reset();
    lastScanAt = null;
  }
  window.addEventListener("keydown", handleKeyDown, capture);
  window.addEventListener("blur", reset);
  window.addEventListener("pointerdown", reset, capture);
  window.addEventListener("focusin", reset, capture);
  document.addEventListener("visibilitychange", reset);
  return () => {
    window.removeEventListener("keydown", handleKeyDown, capture);
    window.removeEventListener("blur", reset);
    window.removeEventListener("pointerdown", reset, capture);
    window.removeEventListener("focusin", reset, capture);
    document.removeEventListener("visibilitychange", reset);
    reset();
  };
}

export function findBarcodeSlot(values: readonly string[], barcode: string) {
  const duplicateIndex = values.findIndex(value => value.trim().toLowerCase() === barcode.toLowerCase());
  if (duplicateIndex !== -1) return { kind: "duplicate", index: duplicateIndex } as const;
  const emptyIndex = values.findIndex(value => !value.trim());
  return emptyIndex === -1
    ? { kind: "full" } as const
    : { kind: "empty", index: emptyIndex } as const;
}

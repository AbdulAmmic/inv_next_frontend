import { useEffect, useRef } from "react";

/**
 * Listens for USB/Bluetooth "keyboard wedge" barcode scanners: they type the
 * code a few milliseconds per character and finish with Enter. Human typing
 * is far slower, so a burst of >= MIN_LENGTH fast keys + Enter is a scan.
 *
 * Keys typed into other inputs are left alone unless the input opts in with
 * `data-scan-target` (e.g. the POS search box), so scanning never corrupts
 * a customer name or a quantity field.
 */
const MAX_GAP_MS = 45;
const MIN_LENGTH = 4;

export function useBarcodeWedge(onScan: (code: string) => void, enabled = true) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let last = 0;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (inField && !target!.hasAttribute("data-scan-target")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = performance.now();
      if (now - last > MAX_GAP_MS) buffer = "";
      last = now;

      if (e.key === "Enter") {
        if (buffer.length >= MIN_LENGTH) {
          const code = buffer;
          buffer = "";
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled]);
}

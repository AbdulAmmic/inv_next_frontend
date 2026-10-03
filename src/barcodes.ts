// Product barcodes: validation, generation and rendering.
//
// Generated codes are EAN-13 in the GS1 "restricted circulation" range
// (prefix 2xx), which is reserved for in-store use, so they can never clash
// with a manufacturer barcode printed on real packaging.

export function ean13CheckDigit(first12: string): number {
  const sum = first12
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

export function isValidEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  const sum = code.slice(0, 7).split("").reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(code[7]);
}

export function isValidUpcA(code: string): boolean {
  return /^\d{12}$/.test(code) && isValidEan13("0" + code);
}

/** Symbology JsBarcode should use for a stored code. */
export function barcodeFormat(code: string): "EAN13" | "EAN8" | "UPC" | "CODE128" {
  if (isValidEan13(code)) return "EAN13";
  if (isValidUpcA(code)) return "UPC";
  if (isValidEan8(code)) return "EAN8";
  return "CODE128";
}

/** New in-store EAN-13 that isn't already used by any product. */
export function generateEan13(taken: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const body = "20" + Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
    const code = body + ean13CheckDigit(body);
    if (!taken.has(code)) {
      taken.add(code);
      return code;
    }
  }
  throw new Error("Couldn't generate a unique barcode");
}

/** Render a barcode to a PNG data URL (high resolution, for PDFs). */
export async function barcodePng(code: string, opts: { height?: number; showText?: boolean } = {}): Promise<string> {
  const JsBarcode = (await import("jsbarcode")).default;
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, code, {
    format: barcodeFormat(code),
    width: 4,
    height: opts.height ?? 120,
    displayValue: opts.showText ?? true,
    fontSize: 34,
    textMargin: 4,
    margin: 8,
    background: "#ffffff",
    lineColor: "#000000",
    flat: true,
  });
  return canvas.toDataURL("image/png");
}

/** Render a barcode as SVG markup (crisp on-screen previews). */
export async function barcodeSvg(code: string, opts: { height?: number; showText?: boolean } = {}): Promise<string> {
  const JsBarcode = (await import("jsbarcode")).default;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: barcodeFormat(code),
    width: 2,
    height: opts.height ?? 50,
    displayValue: opts.showText ?? true,
    fontSize: 14,
    textMargin: 2,
    margin: 0,
    background: "transparent",
    flat: true,
  });
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return svg.outerHTML;
}

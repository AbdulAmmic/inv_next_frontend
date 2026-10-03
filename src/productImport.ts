// Excel/CSV product template: build, export, and parse.
// exceljs is loaded on demand so it never weighs down the other pages.

export type ImportRow = {
  _row: number;
  name?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  unit?: string;
  price?: string;
  cost_price?: string;
  quantity?: string;
  min_quantity?: string;
  shelf_location?: string;
  expiry_date?: string;
  batch_number?: string;
  description?: string;
};

type Column = { key: keyof Omit<ImportRow, "_row">; header: string; width: number; note: string; example: string | number };

export const TEMPLATE_COLUMNS: Column[] = [
  { key: "name", header: "Product Name", width: 30, note: "Required for new products.", example: "Paracetamol 500mg" },
  { key: "sku", header: "SKU", width: 16, note: "Optional. If it matches an existing product, that product is updated instead of created.", example: "PCM-500" },
  { key: "barcode", header: "Barcode", width: 18, note: "Optional. Also used to match existing products when SKU is blank.", example: "6151100012345" },
  { key: "category", header: "Category", width: 18, note: "Optional.", example: "Analgesics" },
  { key: "unit", header: "Unit", width: 10, note: "Optional, e.g. Pack, Piece, Bottle.", example: "Pack" },
  { key: "price", header: "Selling Price", width: 14, note: "Required for new products.", example: 500 },
  { key: "cost_price", header: "Cost Price", width: 14, note: "Optional (defaults to 0).", example: 350 },
  { key: "quantity", header: "Quantity", width: 11, note: "Stock in the selected shop. For existing products this SETS the quantity (logged as an import adjustment).", example: 120 },
  { key: "min_quantity", header: "Reorder Level", width: 14, note: "Low-stock alert threshold.", example: 20 },
  { key: "shelf_location", header: "Shelf Location", width: 15, note: "Optional, e.g. A1.", example: "A1" },
  { key: "expiry_date", header: "Expiry Date", width: 14, note: "YYYY-MM-DD or DD/MM/YYYY. Drives the expiry alerts.", example: "2027-06-30" },
  { key: "batch_number", header: "Batch Number", width: 15, note: "Optional. With an expiry date, updates that batch (or creates it).", example: "BN-0425" },
  { key: "description", header: "Description", width: 30, note: "Optional.", example: "" },
];

const BRAND = "FFD4940A";

async function loadExcel() {
  const mod: any = await import("exceljs");
  return mod.default ?? mod;
}

function saveBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function buildWorkbook(rows: Array<Record<string, any>>, withExample: boolean) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Inventory Manager";

  const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell: any, col: number) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle" };
    cell.note = TEMPLATE_COLUMNS[col - 1].note;
  });

  rows.forEach((r) => ws.addRow(r));

  // Light validation so typos get caught in Excel before upload.
  const lastRow = Math.max(500, rows.length + 200);
  const numberCols = ["price", "cost_price", "quantity", "min_quantity"];
  TEMPLATE_COLUMNS.forEach((c, i) => {
    if (!numberCols.includes(c.key)) return;
    const letter = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= lastRow; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: "decimal",
        operator: "greaterThanOrEqual",
        allowBlank: true,
        formulae: [0],
        showErrorMessage: true,
        errorTitle: "Invalid number",
        error: `${c.header} must be a number of 0 or more.`,
      };
    }
  });

  const help = wb.addWorksheet("Instructions");
  help.columns = [{ width: 18 }, { width: 90 }];
  help.addRow(["How to use this template"]).font = { bold: true, size: 14 };
  help.addRow([]);
  [
    "1. Fill one product per row on the Products sheet. Keep the header row as it is.",
    "2. New products need at least a Product Name and Selling Price.",
    "3. To UPDATE existing products, put their SKU (or Barcode). Blank cells are left unchanged.",
    "4. Quantity, Reorder Level, Shelf Location and Expiry Date apply to the shop you pick when uploading.",
    "5. Upload the file from Products → Import / Export. You'll see a preview and a per-row report.",
  ].forEach((t) => help.addRow(["", t]));
  if (withExample) {
    // The example lives here, not on the Products sheet, so a forgotten
    // sample row can never be imported as a real product.
    help.addRow([]);
    help.addRow(["Example row (for reference only — not imported)"]).font = { bold: true };
    const hdr = help.addRow(TEMPLATE_COLUMNS.map((c) => c.header));
    hdr.font = { bold: true, color: { argb: "FF8A7050" } };
    help.addRow(TEMPLATE_COLUMNS.map((c) => c.example)).font = { italic: true, color: { argb: "FF8A7050" } };
  }
  help.addRow([]);
  help.addRow(["Column", "Notes"]).font = { bold: true };
  TEMPLATE_COLUMNS.forEach((c) => help.addRow([c.header, c.note]));

  return wb;
}

export async function downloadTemplate() {
  const wb = await buildWorkbook([], true);
  saveBlob(await wb.xlsx.writeBuffer(), "products-template.xlsx");
}

export async function exportProductsToExcel(rows: Array<Record<string, any>>, shopName?: string) {
  const wb = await buildWorkbook(rows, false);
  const stamp = new Date().toISOString().slice(0, 10);
  const safeShop = (shopName || "products").replace(/[^\w-]+/g, "-").toLowerCase();
  saveBlob(await wb.xlsx.writeBuffer(), `${safeShop}-${stamp}.xlsx`);
}

// ------------------------------------------------------------------
// Parsing
// ------------------------------------------------------------------
const normalise = (s: string) => s.toLowerCase().replace(/\(.*?\)|\*/g, "").replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<string, keyof Omit<ImportRow, "_row">> = (() => {
  const map: Record<string, any> = {};
  TEMPLATE_COLUMNS.forEach((c) => {
    map[normalise(c.header)] = c.key;
    map[normalise(c.key)] = c.key;
  });
  Object.assign(map, {
    name: "name", product: "name", productname: "name", item: "name",
    price: "price", sellingprice: "price", saleprice: "price",
    cost: "cost_price", costprice: "cost_price",
    qty: "quantity", stock: "quantity", quantity: "quantity",
    reorderlevel: "min_quantity", minquantity: "min_quantity", minstock: "min_quantity",
    shelf: "shelf_location", location: "shelf_location",
    expiry: "expiry_date", expirydate: "expiry_date", exp: "expiry_date",
    batch: "batch_number", batchno: "batch_number",
  });
  return map;
})();

const pad = (n: number) => String(n).padStart(2, "0");

function cellToString(v: any): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    // exceljs returns dates as UTC midnight
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  if (typeof v === "object") {
    if ("result" in v) return cellToString(v.result);
    if ("text" in v) return String(v.text);
    if ("richText" in v) return v.richText.map((t: any) => t.text).join("");
    if ("hyperlink" in v) return String(v.hyperlink);
  }
  return String(v).trim();
}

function rowsFromMatrix(matrix: string[][]): ImportRow[] {
  const headerIndex = matrix.findIndex((r) => r.some((c) => HEADER_ALIASES[normalise(c || "")]));
  if (headerIndex < 0) throw new Error("Couldn't find a header row. Use the template's column names.");
  const keys = matrix[headerIndex].map((h) => HEADER_ALIASES[normalise(h || "")]);
  if (!keys.includes("name") && !keys.includes("sku") && !keys.includes("barcode")) {
    throw new Error("The file needs a Product Name, SKU or Barcode column.");
  }

  const rows: ImportRow[] = [];
  matrix.slice(headerIndex + 1).forEach((cells, i) => {
    const row: ImportRow = { _row: headerIndex + i + 2 };
    let filled = false;
    keys.forEach((key, c) => {
      if (!key) return;
      const val = (cells[c] ?? "").toString().trim();
      if (val) {
        (row as any)[key] = val;
        filled = true;
      }
    });
    if (filled) rows.push(row);
  });
  return rows;
}

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

export async function parseProductFile(file: File): Promise<ImportRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return rowsFromMatrix(parseCsv((await file.text()).replace(/^﻿/, "")));
  }
  if (!name.endsWith(".xlsx")) {
    throw new Error("Please upload an .xlsx or .csv file (old .xls files: re-save as .xlsx).");
  }
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet("Products") || wb.worksheets[0];
  if (!ws) throw new Error("The workbook has no sheets.");

  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
      cells[col - 1] = cellToString(cell.value);
    });
    matrix[rowNumber - 1] = cells;
  });
  for (let i = 0; i < matrix.length; i++) matrix[i] = matrix[i] || [];
  return rowsFromMatrix(matrix);
}

/** Friendly text for the backend's per-row error codes. */
export function describeImportError(code: string): string {
  if (code.startsWith("invalid_number:")) return `Not a number: ${code.split(":")[1].replace("_", " ")}`;
  if (code.startsWith("invalid_date:")) return `Unreadable date "${code.slice(13)}" — use YYYY-MM-DD`;
  return (
    {
      name_required: "Product name is required for new products",
      price_required: "Selling price is required for new products",
      sku_already_exists: "SKU already used by another product",
      barcode_already_exists: "Barcode already used by another product",
      quantity_cannot_be_negative: "Quantity can't be negative",
      forbidden_for_shop: "You don't have access to this shop",
    } as Record<string, string>
  )[code] || code.replace(/_/g, " ");
}

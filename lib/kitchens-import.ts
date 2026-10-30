import { unzipSync, strFromU8 } from "fflate";
import type { Kitchen, Meal } from "@/data/kitchenDishes";

/**
 * Reading a menu spreadsheet in the browser, for admin → Kitchens Page → Dishes.
 *
 * An .xlsx file is a zip of XML, which is all this needs from it. The expected
 * shape is a table with Category, Item name, Description and a price column,
 * plus optional Arabic name, Arabic description and "add on" columns, starting
 * on whichever row those headings are on.
 * Nothing is saved here: the admin sees the result first, and the server checks
 * every row again when it is sent.
 */

export interface ImportAddon {
  name: string;
  price: number;
}

export interface ImportDish {
  meal: Meal;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  addons: ImportAddon[];
}

export interface ImportProblem {
  /** The row number as Excel shows it. */
  row: number;
  name: string;
  reason: string;
}

export interface ParsedMenu {
  /** The first text above the table, such as "Italian Cuisine Menu". */
  title: string;
  /** Guessed from the title; the admin can change it. */
  kitchen: Kitchen | null;
  dishes: ImportDish[];
  problems: ImportProblem[];
}

/* Lunch and dinner share one tab on the page, so a combined category is filed
   under lunch. */
const MEAL_BY_CATEGORY: Record<string, Meal> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  lunchdinner: "lunch",
  lunchanddinner: "lunch",
};

const NAME_HEADINGS = ["itemname", "itemnameenglish", "itemnameen"];
// Arabic headings have no Latin letters, so they are compared as written.
const NAME_AR_HEADINGS = ["اسم الطبق", "الاسم بالعربية"];
const DESCRIPTION_AR_HEADINGS = ["وصف الطبق", "الوصف بالعربية"];

/** The price column is headed with the restaurant's name in the menu file. */
const PRICE_HEADINGS = ["price", "twoinone", "aed"];

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
// Pasted menu text often carries double spaces.
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

const xml = (bytes: Uint8Array) => new DOMParser().parseFromString(strFromU8(bytes), "application/xml");

/** "BC12" → the zero-based column index of BC. */
function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "";
  return letters.split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
}

/** The first sheet's rows as { row number, cells by column index }. */
function readRows(files: Record<string, Uint8Array>): { row: number; cells: string[] }[] {
  const shared = files["xl/sharedStrings.xml"]
    ? Array.from(xml(files["xl/sharedStrings.xml"]).getElementsByTagName("si")).map((si) =>
        // Rich text splits one string across several <t>; phonetic hints are not part of it.
        Array.from(si.getElementsByTagName("t"))
          .filter((t) => t.parentElement?.localName !== "rPh")
          .map((t) => t.textContent ?? "")
          .join(""),
      )
    : [];

  const sheetRef = xml(files["xl/workbook.xml"]).getElementsByTagName("sheet")[0];
  const rId = Array.from(sheetRef?.attributes ?? []).find((a) => a.localName === "id")?.value;
  const target = Array.from(xml(files["xl/_rels/workbook.xml.rels"]).getElementsByTagName("Relationship"))
    .find((r) => r.getAttribute("Id") === rId)
    ?.getAttribute("Target");
  if (!target) throw new Error("no sheet");
  const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  if (!files[path]) throw new Error("no sheet");

  return Array.from(xml(files[path]).getElementsByTagName("row")).map((row) => {
    const cells: string[] = [];
    for (const c of Array.from(row.getElementsByTagName("c"))) {
      const type = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      const text =
        type === "s"
          ? shared[Number(v)] ?? ""
          : type === "inlineStr"
            ? Array.from(c.getElementsByTagName("t")).map((t) => t.textContent ?? "").join("")
            : v;
      cells[columnIndex(c.getAttribute("r") ?? "A")] = text;
    }
    return { row: Number(row.getAttribute("r")), cells };
  });
}

/** Throws a message fit to show the admin if this is not a menu file. */
export function parseMenuFile(bytes: Uint8Array): ParsedMenu {
  let rows: { row: number; cells: string[] }[];
  try {
    rows = readRows(unzipSync(bytes));
  } catch {
    throw new Error("That file couldn't be read. Please upload an Excel .xlsx file.");
  }

  const headerAt = rows.findIndex((r) => {
    const names = r.cells.map((c) => normalise(c ?? ""));
    return names.includes("category") && names.some((n) => NAME_HEADINGS.includes(n));
  });
  if (headerAt === -1) {
    throw new Error('Couldn\'t find the "Category" and "Item name" headings in that file.');
  }

  const headers = rows[headerAt].cells.map((c) => normalise(c ?? ""));
  const col = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const categoryCol = col("category");
  const nameCol = col(...NAME_HEADINGS);
  const rawHeaders = rows[headerAt].cells.map((c) => tidy(c ?? ""));
  const nameArCol = rawHeaders.findIndex((h) => NAME_AR_HEADINGS.includes(h));
  const descriptionArCol = rawHeaders.findIndex((h) => DESCRIPTION_AR_HEADINGS.includes(h));
  const descriptionCol = col("description");
  const priceCol = col(...PRICE_HEADINGS);
  if (priceCol === -1) {
    throw new Error(`Couldn't find a price column. Head it "Price" or "twoinone".`);
  }
  const addonCols = headers.flatMap((h, i) => (/^addon\d*$/.test(h) ? [i] : []));

  const title = tidy(rows.slice(0, headerAt).flatMap((r) => r.cells).find(Boolean) ?? "");
  const lowerTitle = title.toLowerCase();
  const kitchen: Kitchen | null = lowerTitle.includes("italian")
    ? "italian"
    : lowerTitle.includes("turkish")
      ? "turkish"
      : null;

  const dishes: ImportDish[] = [];
  const problems: ImportProblem[] = [];
  const seen = new Set<string>();

  for (const { row, cells } of rows.slice(headerAt + 1)) {
    const cell = (i: number) => tidy(cells[i] ?? "");
    const name = cell(nameCol);
    const category = cell(categoryCol);
    const priceText = cell(priceCol);
    // The rest of an Excel table is often empty rows.
    if (!name && !category && !priceText) continue;

    const fail = (reason: string) => problems.push({ row, name: name || "(no name)", reason });

    const meal = MEAL_BY_CATEGORY[normalise(category)];
    const price = Number(priceText);
    if (!name) { fail("No item name"); continue; }
    if (!meal) { fail(`Category must be Breakfast, Lunch, Dinner or Lunch & Dinner, not "${category}"`); continue; }
    if (!priceText || !Number.isFinite(price) || price < 0) {
      fail(priceText ? `Price isn't a number: "${priceText}"` : "No price");
      continue;
    }

    const key = `${meal}|${name.toLowerCase()}`;
    if (seen.has(key)) { fail("Same dish appears twice in this file"); continue; }
    seen.add(key);

    dishes.push({
      meal,
      name,
      name_ar: nameArCol === -1 ? "" : cell(nameArCol),
      description: descriptionCol === -1 ? "" : cell(descriptionCol),
      description_ar: descriptionArCol === -1 ? "" : cell(descriptionArCol),
      // The format has no column for add-on prices, so they start at zero.
      price,
      addons: addonCols.map(cell).filter(Boolean).map((addon) => ({ name: addon, price: 0 })),
    });
  }

  return { title, kitchen, dishes, problems };
}

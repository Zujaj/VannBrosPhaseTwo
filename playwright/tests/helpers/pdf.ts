import { readFileSync, statSync } from 'fs';

/**
 * Reading exported PDFs.
 *
 * Text extraction goes through `pdf-parse`. It is a real dependency rather than a hand-rolled
 * decoder for a reason: the work-order export draws every string as glyph indexes into
 * embedded font subsets (`<0001> Tj`, `/Encoding /Identity`), and the document carries three
 * subsets that each number their glyphs from 0001. Decoding that by hand means resolving each
 * page's `/Resources /Font` to its `/ToUnicode` CMap per font — and a half-working version
 * would silently return the wrong characters, letting content assertions pass against garbage.
 *
 * `readPdfFacts` stays dependency-free because structural checks (is this a PDF, how many
 * pages, does it embed images) are cheap to compute from the raw bytes and are all the
 * generation cases need.
 */

export interface PdfFacts {
  /** File size in bytes. */
  bytes: number;
  /** True when the file starts with the `%PDF-` signature. */
  isPdf: boolean;
  /** PDF version from the header, e.g. "1.4". */
  version: string | null;
  /** Number of page objects declared in the document. */
  pages: number;
  /** Number of embedded images — the export renders its map and photos as image XObjects. */
  images: number;
}

/** Read the structural facts of a PDF without parsing its content streams. */
export function readPdfFacts(filePath: string): PdfFacts {
  const buffer = readFileSync(filePath);
  const raw = buffer.toString('latin1');
  return {
    bytes: statSync(filePath).size,
    isPdf: raw.startsWith('%PDF-'),
    version: raw.match(/^%PDF-(\d+\.\d+)/)?.[1] ?? null,
    // `/Type /Page` with a trailing non-`s` so `/Type /Pages` (the tree node) is excluded.
    pages: (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length,
    images: (raw.match(/\/Subtype\s*\/Image/g) ?? []).length,
  };
}

/**
 * Extract the PDF's text as a single whitespace-normalised string.
 *
 * Normalising collapses the page/column layout, so assert on the presence of section headings
 * and values rather than on their arrangement — the export's tables interleave headers and
 * cells in reading order, not column order.
 */
export async function extractPdfText(filePath: string): Promise<string> {
  // Required lazily: `pdf-parse` is CommonJS and pulls in a sizeable PDF.js runtime, which
  // there is no reason to load for specs that never touch a PDF.
  const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse');
  const parser = new PDFParse({ data: readFileSync(filePath) });
  const result = await parser.getText();
  return (result.text ?? '').replace(/\s+/g, ' ').trim();
}

/** Phrases from `expected` that do NOT appear in `text` (case-insensitive). */
export function missingFrom(text: string, expected: string[]): string[] {
  const haystack = text.toLowerCase();
  return expected.filter((phrase) => !haystack.includes(phrase.toLowerCase()));
}

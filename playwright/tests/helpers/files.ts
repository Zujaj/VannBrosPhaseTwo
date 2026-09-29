/**
 * Upload payloads for `setInputFiles` / `FileChooser.setFiles`.
 *
 * Real files live in `playwright/fixtures/Test Data/` (a 1280x720 JPEG/PNG/WebP, a PDF, a DOCX,
 * an MP4 clip, …) and are loaded with `fixtureFile()`. Each upload is renamed with a run id so a
 * test can find exactly the file it sent in a shared thread. `pngFile()` / `pdfFile()` generate
 * tiny valid files in memory for tests that only need *a* file, not a realistic one.
 */
import { readFileSync } from 'fs';
import path from 'path';

export interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** A per-run id for file names, so a test can locate its own upload in a shared thread. */
export function runId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// A 1x1 transparent PNG.
const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function pngFile(name = `e2e-${runId()}.png`): UploadFile {
  return { name, mimeType: 'image/png', buffer: Buffer.from(PNG_1X1, 'base64') };
}

/** A one-page PDF showing `text`, with a correct xref table so strict parsers accept it. */
export function pdfFile(name = `e2e-${runId()}.pdf`, text = 'E2E upload'): UploadFile {
  const stream = `BT /F1 12 Tf 20 100 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(body, 'latin1') };
}

const FIXTURE_FILES = path.resolve(__dirname, '../../fixtures/Test Data');

/** The files in `fixtures/Test Data/` that specs upload, with the MIME type the browser would send. */
export const FIXTURES = {
  jpg: { file: 'Test.jpg', mimeType: 'image/jpeg' },
  png: { file: 'Test.png', mimeType: 'image/png' },
  webp: { file: 'Test.webp', mimeType: 'image/webp' },
  pdf: { file: 'Test.pdf', mimeType: 'application/pdf' },
  docx: {
    file: 'Test.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  xlsx: { file: 'Test.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  txt: { file: 'Test.txt', mimeType: 'text/plain' },
  mp4: { file: 'Test.mp4', mimeType: 'video/mp4' },
} as const;

/** A real file from `fixtures/Test Data/`, renamed `e2e-<run id>.<ext>`. */
export function fixtureFile(kind: keyof typeof FIXTURES): UploadFile {
  const { file, mimeType } = FIXTURES[kind];
  return {
    name: `e2e-${runId()}${path.extname(file)}`,
    mimeType,
    buffer: readFileSync(path.join(FIXTURE_FILES, file)),
  };
}

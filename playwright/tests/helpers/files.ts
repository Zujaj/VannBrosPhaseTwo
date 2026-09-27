/**
 * In-memory upload payloads for `setInputFiles` / `FileChooser.setFiles`.
 *
 * Tiny but valid files, generated per run: nothing binary lives in git, and each name carries a
 * run id so a test can find exactly the file it sent. The bytes are real PNG / PDF, because the
 * server may thumbnail or preview what it receives.
 *
 * TODO: upload real files from the playwright/fixtures directory (e.g. `fixtures/files/`: a
 * phone JPEG with EXIF orientation, a multi-page PDF, a short MP4 for CC-023) for the cases a
 * synthetic buffer cannot cover. Keep each one small (tens of KB) and load them with
 * `fileFromFixture()` below.
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

const FIXTURE_FILES = path.resolve(__dirname, '../../fixtures/files');

/** A committed fixture file from `playwright/fixtures/files/`, renamed with a run id. */
export function fileFromFixture(fileName: string, mimeType: string): UploadFile {
  const ext = path.extname(fileName);
  return {
    name: `e2e-${runId()}${ext}`,
    mimeType,
    buffer: readFileSync(path.join(FIXTURE_FILES, fileName)),
  };
}

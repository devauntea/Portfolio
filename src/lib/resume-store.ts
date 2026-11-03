/* Where the current résumé lives. Blob first, bundled PDF second.

   A connected store supplies BLOB_STORE_ID. In deployed functions, the Blob
   SDK gets the OIDC token from the request context, not necessarily an env
   variable. Let the SDK authenticate; configuration is not authentication.
   Static BLOB_READ_WRITE_TOKEN connections remain supported too.

   Blobs are private on purpose: /api/resume/file is the only read path, so a
   public URL would just be a second, uncontrolled way to reach the document. */

import { del, get, head, put } from "@vercel/blob";

export const RESUME_BLOB_PATH = "resume/current.pdf";
export const RESUME_FILENAME = "Devauntae_Norman_Resume.pdf";
export const BUNDLED_RESUME_URL = `/docs/${RESUME_FILENAME}`;

export interface ResumeMeta {
  source: "blob" | "bundled";
  updatedAt: string | null;
  filename: string;
}

export function blobConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BLOB_STORE_ID?.trim() || env.BLOB_READ_WRITE_TOKEN?.trim());
}

const bundled = (): ResumeMeta => ({
  source: "bundled",
  updatedAt: null,
  filename: RESUME_FILENAME,
});

export async function resumeMeta(): Promise<ResumeMeta> {
  if (!blobConfigured()) return bundled();
  try {
    const info = await head(RESUME_BLOB_PATH);
    return {
      source: "blob",
      updatedAt: info.uploadedAt.toISOString(),
      filename: RESUME_FILENAME,
    };
  } catch {
    /* not uploaded yet, or storage is unreachable — the bundled copy stands in */
    return bundled();
  }
}

/** The uploaded PDF as a stream, or null to mean "use the bundled copy". */
export async function readResumeStream(): Promise<ReadableStream<Uint8Array> | null> {
  if (!blobConfigured()) return null;
  try {
    /* useCache:false — the pathname is overwritten in place, so a cached copy
       would keep serving the previous résumé after an upload. */
    const res = await get(RESUME_BLOB_PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return res.stream;
  } catch {
    return null;
  }
}

export async function writeResume(bytes: Uint8Array): Promise<void> {
  /* PutBody accepts Buffer but not a bare Uint8Array; this view shares the
     same memory rather than copying the upload a second time. */
  const body = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  await put(RESUME_BLOB_PATH, body, {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/pdf",
  });
}

export async function deleteResume(): Promise<void> {
  await del(RESUME_BLOB_PATH);
}

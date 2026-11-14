import { Injectable } from '@nestjs/common';

/**
 * FileStorage port (S3-compatible). Adapters are swappable (brief 11.6).
 * Uploaded files must be validated & virus-scanned before acceptance (SECURITY-16, US-17/US-19).
 */
export interface FileStorage {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export const FILE_STORAGE = 'FILE_STORAGE';

const ALLOWED_DOC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB

export class FileValidationError extends Error {}

/** Validate an uploaded file's declared type and size before storing (US-17/US-19). */
export function validateUpload(contentType: string, sizeBytes: number): void {
  if (!ALLOWED_DOC_TYPES.has(contentType)) {
    throw new FileValidationError(`Unsupported file type: ${contentType}`);
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_DOC_BYTES) {
    throw new FileValidationError(`File size out of range: ${sizeBytes}`);
  }
}

/**
 * Development in-memory adapter. Production uses an S3-compatible adapter
 * (configured via env) with a real virus-scan step.
 */
@Injectable()
export class InMemoryFileStorage implements FileStorage {
  private readonly store = new Map<string, { body: Buffer; contentType: string }>();

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    this.store.set(key, { body, contentType });
  }

  async getSignedUrl(key: string): Promise<string> {
    return `memory://${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    this.store.delete(key);
  }
}

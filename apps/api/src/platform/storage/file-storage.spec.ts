import { describe, it, expect } from 'vitest';
import { validateUpload, FileValidationError } from './file-storage.js';

describe('validateUpload', () => {
  it('accepts allowed types within size', () => {
    expect(() => validateUpload('image/jpeg', 1024)).not.toThrow();
    expect(() => validateUpload('application/pdf', 5 * 1024 * 1024)).not.toThrow();
  });

  it('rejects disallowed content types', () => {
    expect(() => validateUpload('application/x-msdownload', 1024)).toThrow(FileValidationError);
    expect(() => validateUpload('text/html', 1024)).toThrow(FileValidationError);
  });

  it('rejects empty or oversized files', () => {
    expect(() => validateUpload('image/png', 0)).toThrow(FileValidationError);
    expect(() => validateUpload('image/png', 11 * 1024 * 1024)).toThrow(FileValidationError);
  });
});

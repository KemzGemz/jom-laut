import { Global, Module } from '@nestjs/common';
import { FILE_STORAGE, InMemoryFileStorage } from './file-storage.js';

/**
 * FileStorage port binding. Dev/test use the in-memory adapter; production binds
 * an S3-compatible adapter (configured via env) — swappable without domain changes.
 */
@Global()
@Module({
  providers: [{ provide: FILE_STORAGE, useClass: InMemoryFileStorage }],
  exports: [FILE_STORAGE],
})
export class StorageModule {}

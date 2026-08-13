import { Logger } from '@nestjs/common';
import type { StorageProvider } from '@mintreels/storage';

const logger = new Logger('StorageCleanup');

export function nonEmptyStorageKeys(
  ...keys: Array<string | null | undefined>
): string[] {
  return keys.filter((key): key is string => typeof key === 'string' && key.trim() !== '');
}

/** Best-effort remote delete. Never logs keys or URLs. Always continues after failure. */
export async function deleteStoredKeys(
  storage: StorageProvider,
  keys: Array<string | null | undefined>,
): Promise<void> {
  for (const key of nonEmptyStorageKeys(...keys)) {
    try {
      await storage.delete(key);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      logger.warn(`Storage delete failed (${reason})`);
    }
  }
}

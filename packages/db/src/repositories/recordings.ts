import type { Database } from '../client';
import { recordings } from '../schema';

export function createRecordingRepository(_db: Database) {
  return {
    // TODO: implement recording persistence
    async list() {
      void recordings;
      throw new Error('RecordingRepository.list is not implemented');
    },
  };
}

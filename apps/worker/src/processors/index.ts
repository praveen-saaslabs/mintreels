import { DEFAULT_MAX_ATTEMPTS, JOB_NAMES } from '@mintreels/domain';
import { QUEUE_NAMES } from '../queues/names';

export function createProcessors(): void {
  void DEFAULT_MAX_ATTEMPTS;
  void JOB_NAMES;
  void QUEUE_NAMES;
  // TODO: bind job functions to BullMQ workers with bounded retries (queued → running → success | failed)
  throw new Error('createProcessors is not implemented');
}

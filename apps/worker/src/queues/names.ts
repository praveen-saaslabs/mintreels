export const QUEUE_NAMES = {
  media: 'mintreels-media',
  ai: 'mintreels-ai',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

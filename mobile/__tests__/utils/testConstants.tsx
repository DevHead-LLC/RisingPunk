export const TEST_VALUES = {
  STANDARD_BUILD_QUANTITY: 5,
  LARGE_BUILD_QUANTITY: 1000,
  MAX_BUILD_LIMIT: 1000,
  DEBOUNCE_DELAY: 300,
  PROGRESS_UPDATE_INTERVAL: 100,
  ERROR_RETRY_DELAY: 300,
  BOT_TYPES: ['breacher', 'guardian', 'phreak'] as const,
  MEMORY_OVERHEAD_LIMIT: 1.1
};

export const TEST_IDS = {
  BOT_CARD: (type: string) => `bot-card-${type}`,
  QUANTITY_INPUT: 'quantity-input',
  PROGRESS_FILL: 'progress-fill',
  BUILD_STATUS: 'build-status',
  BUILD_BUTTON: 'build-button',
  QUEUE_BUTTON: 'queue-button',
  RESUME_BUILD: 'resume-build-button',
  ERROR_MESSAGE: 'error-message',
  RETRY_TIMER: 'retry-timer',
  QUEUE_ITEM: (index: number) => `queue-item-${index}`,
  QUEUE_ITEM_UP: (index: number) => `queue-item-${index}-up`,
  QUEUE_ITEM_CANCEL: (index: number) => `queue-item-${index}-cancel`
}; 
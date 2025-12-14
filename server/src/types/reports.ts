export type ReportContext = 
  | 'username'
  | 'crew-name'
  | 'crew-identifier'
  | 'internal-message-board'
  | 'external-message-board'
  | 'crew-rules'
  | 'chat-message';

export type ReportReason = 
  | 'vulgar'
  | 'hate-speech'
  | 'harassment'
  | 'spam'
  | 'other';

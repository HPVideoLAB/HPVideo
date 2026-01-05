// $lib/features/img-to-video/types.ts
export type Resolution = '720p' | '1080p';
export type UploadStatus = 'idle' | 'valid' | 'uploading' | 'success' | 'error';
export type TaskStatus = 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';

export type Transition = { duration: number; prompt?: string };

export type FormErrors = {
  globalPrompt?: string;
  seed?: string;
  resolution?: string;
  transitions?: Array<{ duration?: string; prompt?: string }>;
  __form?: string;
};

export const IMG_TO_VIDEO_RULES = {
  MAX_FILES: 5,
  MIN_FILES: 2,
  MAX_TOTAL_DURATION: 25,
  MAX_SEED: 2147483647,
  MIN_DURATION: 5,
} as const;

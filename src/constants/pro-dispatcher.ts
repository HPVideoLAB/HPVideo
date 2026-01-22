// src/lib/constants/model-registry.ts
import { validateImgToVideoForm, validateWanForm, validateSamForm, totalDuration } from '../routes/pro/modules/form';

export const modelRegistry: Record<string, any> = {
  pika: {
    validate: (f: any) =>
      validateImgToVideoForm({
        filesLen: f.files.length,
        globalPrompt: f.prompt,
        transitions: f.transitions,
        seed: f.seed,
      }),
    submitMethod: 'submitPika',
    // 转换函数：将 UI 状态转为 API 参数
    formatPayload: (f: any, hash: string) => ({
      files: f.files,
      prompt: f.prompt,
      resolution: f.resolution,
      transitions: f.transitions,
      seed: f.seed,
      txHash: hash,
    }),
    getPricingParams: (f: any) => ({
      resolution: f.resolution,
      duration: Math.max(totalDuration(f.transitions), 5),
    }),
  },
  'wan-2.1': {
    validate: (f: any) =>
      validateWanForm({
        hasVideo: !!f.video,
        ...f,
        num_inference_steps: f.steps,
        guidance_scale: f.cfg,
        flow_shift: f.flow,
      }),
    submitMethod: 'submitWan',
    formatPayload: (f: any, hash: string) => ({
      videoFile: f.video,
      prompt: f.prompt,
      negative_prompt: f.negative_prompt,
      strength: f.strength,
      seed: f.seed,
      loras: f.loras,
      duration: f.duration,
      num_inference_steps: f.steps,
      guidance_scale: f.cfg,
      flow_shift: f.flow,
      txHash: hash,
    }),
    getPricingParams: (f: any) => ({ duration: f.duration }),
  },
  sam3: {
    validate: (f: any) => validateSamForm({ hasVideo: !!f.video, prompt: f.prompt }),
    submitMethod: 'submitSam',
    formatPayload: (f: any, hash: string) => ({
      videoFile: f.video,
      prompt: f.prompt,
      apply_mask: f.mask,
      txHash: hash,
    }),
    getPricingParams: (f: any) => ({ duration: f.duration || 5 }),
  },
};

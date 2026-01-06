// ./modules/form.ts
import type { FormErrors, Transition } from './types';
import { IMG_TO_VIDEO_RULES as R } from './types';

/** =========
 *  Shared
 *  ========= */
export function isImageFile(f: File) {
  return f.type === 'image/png' || f.type === 'image/jpeg';
}

export function clampImageFiles(next: File[]) {
  const uniq = new Map<string, File>();
  for (const f of next.filter(isImageFile)) {
    uniq.set(`${f.name}-${f.size}-${f.lastModified}`, f);
  }
  return Array.from(uniq.values()).slice(0, R.MAX_FILES);
}

export function syncTransitions(filesLen: number, transitions: Transition[]) {
  const need = Math.max(0, filesLen - 1);
  if (transitions.length === need) return transitions;

  const next: Transition[] = [];
  for (let i = 0; i < need; i++) {
    // 默认递增，避免相邻 duration 相同导致前端立刻报错
    next.push(transitions[i] ?? { duration: R.MIN_DURATION + i, prompt: '' });
  }
  return next;
}

export function totalDuration(transitions: Transition[]) {
  return transitions.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
}

/** =========
 *  Pika
 *  DTO 对齐点：
 *  - images 2~5
 *  - prompt 必填
 *  - transitions 可选：若提供则长度=images-1，每段 duration>=5，总和<=25
 *  - seed 可选：这里按 R.MAX_SEED
 *  ========= */
export function validateImgToVideoForm(args: {
  filesLen: number;
  globalPrompt: string;
  transitions: Transition[];
  seed: number;
}) {
  const { filesLen, globalPrompt, transitions, seed } = args;

  const errors: FormErrors = {};
  const tErr: Array<{ duration?: string; prompt?: string }> = [];

  // images 数量
  if (filesLen < R.MIN_FILES || filesLen > R.MAX_FILES) {
    errors.__form = `请上传 ${R.MIN_FILES}~${R.MAX_FILES} 张图片（images 2~5）。`;
  }

  // prompt 必填
  if (!globalPrompt.trim()) errors.globalPrompt = '请填写提示词（prompt，必填）。';

  // transitions：你前端目前总是传（syncTransitions），所以我们按“必须匹配”校验
  const need = Math.max(0, filesLen - 1);
  if (transitions.length !== need) {
    errors.__form = 'transitions 数量必须等于 图片数量 - 1。';
  }

  // 总时长 <= 25（后端硬限制）
  const td = totalDuration(transitions);
  if (td > R.MAX_TOTAL_DURATION) {
    errors.__form = `转场总时长不能超过 ${R.MAX_TOTAL_DURATION}s（当前 ${td}s）。`;
  }

  // 每段 duration >= 5 且为整数；（相邻不相同是你前端自己的规则，后端没要求，留着也可以）
  for (let i = 0; i < transitions.length; i++) {
    const row: { duration?: string; prompt?: string } = {};
    const d = Number(transitions[i]?.duration);

    if (!Number.isFinite(d) || !Number.isInteger(d)) {
      row.duration = 'duration 必须是整数秒。';
    } else if (d < R.MIN_DURATION) {
      row.duration = `duration 必须是 ≥ ${R.MIN_DURATION} 的整数秒。`;
    }

    // 你原本的“相邻不相同”规则：非 DTO 强制，可保留
    if (i > 0) {
      const prevD = Number(transitions[i - 1]?.duration);
      if (Number.isFinite(d) && Number.isFinite(prevD) && d === prevD) {
        row.duration = `第 ${i + 1} 段 duration 不能与第 ${i} 段相同（当前都是 ${d}s）。`;
      }
    }

    tErr.push(row);
  }

  if (tErr.some((x) => x.duration || x.prompt)) errors.transitions = tErr;

  // seed：-1 ~ MAX_SEED
  const s = Number(seed);
  if (!Number.isFinite(s) || !Number.isInteger(s) || s < -1 || s > R.MAX_SEED) {
    errors.seed = `Seed 必须是整数，范围 -1 ~ ${R.MAX_SEED}（-1 随机）。`;
  }

  // ✅ 更稳的 ok 判定
  const ok =
    !errors.__form &&
    !errors.globalPrompt &&
    !errors.seed &&
    !(errors.transitions && errors.transitions.some((x) => x.duration || x.prompt));

  return { ok, errors };
}

/** =========
 *  Wan / Sam errors 类型（和你 Params 组件字段对齐）
 *  ========= */
export type WanFormErrors = {
  __form?: string;
  globalPrompt?: string;
  duration?: string;
  num_inference_steps?: string;
  guidance_scale?: string;
  flow_shift?: string;
  loras?: string;
  seed?: string;
};

export type SamFormErrors = {
  __form?: string;
  globalPrompt?: string;
};

/** =========
 *  Wan（对齐 DTO）
 *  - video 必填（前端只判断是否上传 File）
 *  - prompt 必填
 *  - duration 5~10
 *  - steps 1~40
 *  - cfg 0~20
 *  - flow 1~10
 *  - loras <= 3，且结构正确
 *  - seed 可选（这里也限制 -1~MAX_SEED，后端只 Min(-1) 未限制上限，前端保守一点）
 *  ========= */
export function validateWanForm(input: {
  hasVideo: boolean;
  prompt: string;
  duration: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  flow_shift?: number;
  seed?: number;
  loras?: Array<{ path: string; scale: number }>;
}) {
  const errors: WanFormErrors = {};

  if (!input.hasVideo) errors.__form = '请先上传视频。';
  if (!input.prompt?.trim()) errors.globalPrompt = '请输入提示词。';

  // duration 5~10（后端硬限制）
  const dur = Number(input.duration);
  if (!Number.isFinite(dur) || !Number.isInteger(dur)) {
    errors.duration = '时长必须为整数。';
  } else if (dur < 5 || dur > 10) {
    errors.duration = '时长范围：5~10 秒。';
  }

  // steps 1~40
  if (input.num_inference_steps !== undefined) {
    const v = Number(input.num_inference_steps);
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 1 || v > 40) {
      errors.num_inference_steps = '步数范围：1~40。';
    }
  }

  // cfg 0~20
  if (input.guidance_scale !== undefined) {
    const v = Number(input.guidance_scale);
    if (!Number.isFinite(v) || v < 0 || v > 20) {
      errors.guidance_scale = 'CFG 范围：0~20。';
    }
  }

  // flow 1~10
  if (input.flow_shift !== undefined) {
    const v = Number(input.flow_shift);
    if (!Number.isFinite(v) || v < 1 || v > 10) {
      errors.flow_shift = 'Flow Shift 范围：1~10。';
    }
  }

  // seed（前端保守）
  if (input.seed !== undefined) {
    const s = Number(input.seed);
    if (!Number.isFinite(s) || !Number.isInteger(s) || s < -1 || s > R.MAX_SEED) {
      errors.seed = `Seed 范围：-1 ~ ${R.MAX_SEED}。`;
    }
  }

  // loras：<=3，结构校验
  if (input.loras !== undefined) {
    if (!Array.isArray(input.loras)) {
      errors.loras = 'Lora 格式错误。';
    } else if (input.loras.length > 3) {
      errors.loras = 'Lora 最多 3 个。';
    } else {
      for (const [idx, l] of input.loras.entries()) {
        if (!l?.path || typeof l.path !== 'string') {
          errors.loras = `第 ${idx + 1} 个 Lora 的 path 无效。`;
          break;
        }
        const sc = Number(l.scale);
        if (!Number.isFinite(sc)) {
          errors.loras = `第 ${idx + 1} 个 Lora 的 scale 无效。`;
          break;
        }
      }
    }
  }

  const ok = Object.values(errors).every((v) => v === undefined);
  return { ok, errors };
}

/** =========
 *  Sam3（对齐 DTO）
 *  - video 必填
 *  - prompt 必填
 *  ========= */
export function validateSamForm(input: { hasVideo: boolean; prompt: string }) {
  const errors: SamFormErrors = {};
  if (!input.hasVideo) errors.__form = '请先上传视频。';
  if (!input.prompt?.trim()) errors.globalPrompt = '请输入提示词。';
  const ok = Object.values(errors).every((v) => v === undefined);
  return { ok, errors };
}

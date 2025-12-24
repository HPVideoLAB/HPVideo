// $lib/features/img-to-video/form.ts
import type { FormErrors, Transition } from './types';
import { IMG_TO_VIDEO_RULES as R } from './types';

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
    // 默认递增，避免一上来全是 5 导致“相邻不相同”立刻报错
    next.push(transitions[i] ?? { duration: R.MIN_DURATION + i, prompt: '' });
  }
  return next;
}

export function totalDuration(transitions: Transition[]) {
  return transitions.reduce((sum, t) => sum + (Number(t.duration) || 0), 0);
}

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

  // transitions 数量必须一致
  const need = Math.max(0, filesLen - 1);
  if (transitions.length !== need) {
    errors.__form = 'transitions 数量必须等于 图片数量 - 1。';
  }

  // 总时长
  const td = totalDuration(transitions);
  if (td > R.MAX_TOTAL_DURATION) {
    errors.__form = `转场总时长不能超过 ${R.MAX_TOTAL_DURATION}s（当前 ${td}s）。`;
  }

  // 每段 duration + 相邻段 duration 不同
  for (let i = 0; i < transitions.length; i++) {
    const row: { duration?: string; prompt?: string } = {};
    const d = Number(transitions[i]?.duration);

    if (!Number.isFinite(d) || !Number.isInteger(d)) {
      row.duration = 'duration 必须是整数秒。';
    } else if (d < R.MIN_DURATION) {
      row.duration = `duration 必须是 ≥ ${R.MIN_DURATION} 的整数秒。`;
    } else if (d > R.MAX_TOTAL_DURATION) {
      row.duration = `duration 不能超过 ${R.MAX_TOTAL_DURATION} 秒。`;
    }

    if (i > 0) {
      const prevD = Number(transitions[i - 1]?.duration);
      if (Number.isFinite(d) && Number.isFinite(prevD) && d === prevD) {
        row.duration = `第 ${i + 1} 段 duration 不能与第 ${i} 段相同（当前都是 ${d}s）。`;
      }
    }

    tErr.push(row);
  }

  if (tErr.some((x) => x.duration || x.prompt)) errors.transitions = tErr;

  // seed 校验
  const s = Number(seed);
  if (!Number.isFinite(s) || !Number.isInteger(s) || s < -1 || s > R.MAX_SEED) {
    errors.seed = `Seed 必须是整数，范围 -1 ~ ${R.MAX_SEED}（-1 随机）。`;
  }

  // ok 判断：忽略 undefined
  const ok = Object.values(errors).every((v) => v === undefined);
  return { ok, errors };
}

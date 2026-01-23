// src/hook/useCommercialPipeline.ts
import { Logger } from '@nestjs/common';
import { useLtx2 } from '@/hook/useLtx2';
import { useKlingVideoToAudio } from '@/hook/useKlingVideoToAudio';
import { useVideoUpscalerPro } from '@/hook/useVideoUpscalerPro';
import { usePika } from '@/hook/usepika';

export type PipelineState = {
  stage:
    | 'ltx_submitted'
    | 'kling_submitted'
    | 'upscale_submitted'
    | 'completed'
    | 'failed';

  // smart-enhancer 输出（可选）
  videoPrompt?: string;
  startFrame?: string;

  // 子任务 id
  ltxRequestId?: string;
  klingRequestId?: string;
  upscaleRequestId?: string;

  // 产物
  videoUrl?: string; // ltx 输出
  dubbedVideoUrl?: string; // kling outputs[0]
  audioUrl?: string; // kling outputs[1]
  finalVideoUrl?: string; // upscaler outputs[0] 或 kling outputs[0]

  // 用户音频参数
  sound_effect_prompt: string;
  bgm_prompt: string;
  asmr_mode?: boolean;

  // 是否升4K
  enableUpscale?: boolean;
  target_resolution?: '720p' | '1080p' | '2k' | '4k';

  // 错误
  error?: string;
};

export const useCommercialPipeline = () => {
  const logger = new Logger('useCommercialPipeline');

  // ✅ 统一轮询（所有模型都是 predictions/{id}/result）
  const pollPrediction = async (id: string) => {
    const { getResult } = usePika();
    return getResult(id);
  };

  const submitLtx = async (args: {
    image: string;
    prompt: string;
    duration?: number;
    seed?: number;
  }) => {
    const { submitLtx2Task } = useLtx2();
    return submitLtx2Task(args);
  };

  const submitKling = async (args: {
    video: string;
    sound_effect_prompt: string;
    bgm_prompt: string;
    asmr_mode?: boolean;
  }) => {
    const { submitKlingAudioTask } = useKlingVideoToAudio();
    return submitKlingAudioTask(args);
  };

  const submitUpscale = async (args: {
    video: string;
    target_resolution?: '720p' | '1080p' | '2k' | '4k';
  }) => {
    const { submitUpscalerTask } = useVideoUpscalerPro();
    return submitUpscalerTask(args);
  };

  /**
   * ✅ 轮询推进一次（由 findOne 调用）
   * 返回：更新后的 state + (可选) 对外展示的 apiResult
   */
  const advanceOnce = async (state: PipelineState) => {
    // -------------------------------------------------------
    // 0) 幂等纠偏：防止重复 submit
    // -------------------------------------------------------
    // 如果 stage 还停在 ltx_submitted，但已经有 klingRequestId，
    // 说明之前已经 submit 过 kling（可能是并发请求/写库延迟/旧数据）。
    // 直接推进到 kling_submitted 去轮询，不再重复 submit。
    if (state.stage === 'ltx_submitted' && state.klingRequestId) {
      logger.warn(
        `[idempotent] stage=ltx_submitted but klingRequestId exists, treat as kling_submitted`,
      );
      state = { ...state, stage: 'kling_submitted' };
    }

    // 如果 stage 还停在 kling_submitted，但已经有 upscaleRequestId，
    // 说明之前已经 submit 过 upscaler，直接去轮询 upscaler。
    if (state.stage === 'kling_submitted' && state.upscaleRequestId) {
      logger.warn(
        `[idempotent] stage=kling_submitted but upscaleRequestId exists, treat as upscale_submitted`,
      );
      state = { ...state, stage: 'upscale_submitted' };
    }

    // -------------------------------------------------------
    // 1) LTX 阶段：ltx_submitted
    // -------------------------------------------------------
    if (state.stage === 'ltx_submitted' && state.ltxRequestId) {
      const r = await pollPrediction(state.ltxRequestId);

      if (r.status === 'completed') {
        const videoUrl = r.resultUrl!;
        const klingId = await submitKling({
          video: videoUrl,
          sound_effect_prompt: state.sound_effect_prompt,
          bgm_prompt: state.bgm_prompt,
          asmr_mode: state.asmr_mode ?? false,
        });

        return {
          state: {
            ...state,
            stage: 'kling_submitted',
            videoUrl,
            klingRequestId: klingId,
          },
          apiResult: { ...r, stage: 'ltx_completed' },
        };
      }

      if (r.status === 'failed') {
        return {
          state: { ...state, stage: 'failed', error: r.error ?? 'ltx failed' },
          apiResult: r,
        };
      }

      return { state, apiResult: { ...r, stage: 'ltx_processing' } };
    }

    // -------------------------------------------------------
    // 2) Kling 阶段：kling_submitted
    // -------------------------------------------------------
    if (state.stage === 'kling_submitted' && state.klingRequestId) {
      const r = await pollPrediction(state.klingRequestId);

      if (r.status === 'completed') {
        // ✅ 你验证过：outputs[0]=带音频视频，outputs[1]=音频
        const dubbedVideoUrl = r.resultUrl!;
        const audioUrl = r.raw?.outputs?.[1];

        if (state.enableUpscale) {
          // ✅ 再加一层幂等：如果已经有 upscaleRequestId，就别重复提交
          if (state.upscaleRequestId) {
            return {
              state: {
                ...state,
                stage: 'upscale_submitted',
                dubbedVideoUrl,
                audioUrl,
              },
              apiResult: { ...r, stage: 'kling_completed', audioUrl },
            };
          }

          const upId = await submitUpscale({
            video: dubbedVideoUrl,
            target_resolution: state.target_resolution ?? '4k',
          });

          return {
            state: {
              ...state,
              stage: 'upscale_submitted',
              dubbedVideoUrl,
              audioUrl,
              upscaleRequestId: upId,
            },
            apiResult: { ...r, stage: 'kling_completed', audioUrl },
          };
        }

        return {
          state: {
            ...state,
            stage: 'completed',
            dubbedVideoUrl,
            audioUrl,
            finalVideoUrl: dubbedVideoUrl,
          },
          apiResult: {
            ...r,
            stage: 'completed',
            audioUrl,
            finalVideoUrl: dubbedVideoUrl,
          },
        };
      }

      if (r.status === 'failed') {
        return {
          state: {
            ...state,
            stage: 'failed',
            error: r.error ?? 'kling failed',
          },
          apiResult: r,
        };
      }

      return { state, apiResult: { ...r, stage: 'kling_processing' } };
    }

    // -------------------------------------------------------
    // 3) Upscale 阶段：upscale_submitted
    // -------------------------------------------------------
    if (state.stage === 'upscale_submitted' && state.upscaleRequestId) {
      const r = await pollPrediction(state.upscaleRequestId);

      if (r.status === 'completed') {
        const finalVideoUrl = r.resultUrl!;
        return {
          state: { ...state, stage: 'completed', finalVideoUrl },
          apiResult: {
            ...r,
            stage: 'completed',
            finalVideoUrl,
            audioUrl: state.audioUrl,
          },
        };
      }

      if (r.status === 'failed') {
        return {
          state: {
            ...state,
            stage: 'failed',
            error: r.error ?? 'upscale failed',
          },
          apiResult: r,
        };
      }

      return { state, apiResult: { ...r, stage: 'upscale_processing' } };
    }

    // -------------------------------------------------------
    // 兜底：未知/缺字段
    // -------------------------------------------------------
    return {
      state,
      apiResult: { status: 'processing', raw: { stage: state.stage } },
    };
  };

  return { submitLtx, advanceOnce };
};

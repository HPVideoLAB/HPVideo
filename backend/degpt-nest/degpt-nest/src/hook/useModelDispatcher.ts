import { BadRequestException } from '@nestjs/common';
import { usePika } from '@/hook/usepika';
import { useWan } from '@/hook/useWan';
import { useSam3 } from '@/hook/useSam3';
import { useVideoUpscalerPro } from '@/hook/useVideoUpscalerPro';
import { useWan26 } from '@/hook/useWan26';

// ❌ 移除 LTX 和 Kling 的 import
// import { useLtx2 } from '@/hook/useLtx2';
// import { useKlingVideoToAudio } from '@/hook/useKlingVideoToAudio';

export type SubmitResult = {
  requestId: string;
  thumbUrl: string;
};

export const useModelDispatcher = () => {
  const submit = async (dto: any): Promise<SubmitResult> => {
    const model = dto.model;

    switch (model) {
      case 'pika': {
        const { submitTask } = usePika();
        const requestId = await submitTask({
          prompt: dto.prompt,
          images: dto.images!,
          resolution: dto.resolution,
          seed: dto.seed,
          transitions: dto.transitions,
        });
        return { requestId, thumbUrl: dto.images?.[0] || '' };
      }

      case 'wan-2.1': {
        const { submitWanTask } = useWan();
        const requestId = await submitWanTask({
          video: dto.video!,
          prompt: dto.prompt,
          negative_prompt: dto.negative_prompt,
          loras: dto.loras,
          strength: dto.strength,
          num_inference_steps: dto.num_inference_steps,
          duration: dto.duration,
          guidance_scale: dto.guidance_scale,
          flow_shift: dto.flow_shift,
          seed: dto.seed,
        });
        return { requestId, thumbUrl: dto.video || '' };
      }

      case 'sam3': {
        const { submitSam3Task } = useSam3();
        const requestId = await submitSam3Task({
          video: dto.video!,
          prompt: dto.prompt,
          apply_mask: dto.apply_mask,
        });
        return { requestId, thumbUrl: dto.video || '' };
      }

      case 'video-upscaler-pro': {
        const { submitUpscalerTask } = useVideoUpscalerPro();
        const requestId = await submitUpscalerTask({
          video: dto.video!,
          target_resolution: dto.target_resolution,
        });
        return { requestId, thumbUrl: dto.video || '' };
      }

      // ✅ [修正] Wan 2.6 单模型调用：透传所有参数
      case 'wan-2.6-i2v': {
        const { submitWan26Task } = useWan26();

        // 🚨 校验 duration，因为它是必填项
        if (!dto.duration) {
          throw new BadRequestException(
            'wan-2.6-i2v 需要 duration 参数 (5, 10, 15)',
          );
        }

        const requestId = await submitWan26Task({
          image: dto.image,
          prompt: dto.prompt,
          seed: dto.seed,
          // 🔥 补全参数
          duration: dto.duration,
          resolution: dto.resolution,
          negative_prompt: dto.negative_prompt,
          shot_type: dto.shot_type,
        });
        return { requestId, thumbUrl: dto.image || '' };
      }

      default:
        throw new BadRequestException('不支持的模型类型');
    }
  };

  return { submit };
};

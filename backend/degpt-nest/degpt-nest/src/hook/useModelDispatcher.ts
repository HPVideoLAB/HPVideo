import { BadRequestException } from '@nestjs/common';
import { usePika } from '@/hook/usepika';
import { useWan } from '@/hook/useWan';
import { useSam3 } from '@/hook/useSam3';
import { useLtx2 } from '@/hook/useLtx2';
import { useVideoUpscalerPro } from '@/hook/useVideoUpscalerPro';
import { useKlingVideoToAudio } from '@/hook/useKlingVideoToAudio';

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

      case 'ltx-2-19b': {
        const { submitLtx2Task } = useLtx2();
        const requestId = await submitLtx2Task({
          image: dto.image!,
          prompt: dto.prompt,
          duration: dto.duration, // ✅ 加上
          seed: dto.seed,
        });

        return { requestId, thumbUrl: dto.image || '' };
      }

      case 'video-upscaler-pro': {
        const { submitUpscalerTask } = useVideoUpscalerPro();
        const requestId = await submitUpscalerTask({
          video: dto.video!,
          target_resolution: dto.target_resolution,
        });
        return { requestId, thumbUrl: dto.video || '' };
      }

      case 'kling-video-to-audio': {
        const { submitKlingAudioTask } = useKlingVideoToAudio();
        const requestId = await submitKlingAudioTask({
          video: dto.video!,
          sound_effect_prompt: dto.sound_effect_prompt,
          bgm_prompt: dto.bgm_prompt,
          asmr_mode: dto.asmr_mode ?? false,
        });
        return { requestId, thumbUrl: dto.video || '' };
      }

      default:
        throw new BadRequestException('不支持的模型类型');
    }
  };

  return { submit };
};

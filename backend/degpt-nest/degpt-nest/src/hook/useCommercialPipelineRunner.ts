import { BadRequestException } from '@nestjs/common';
import { useCommercialPipeline } from '@/hook/useCommercialPipeline';
import { SmartEnhancerService } from '@/smart-enhancer/smart-enhancer.service';

export const useCommercialPipelineRunner = () => {
  const run = async (args: {
    dto: any;
    record: any | null; // mongoose doc
    userId: string;
    txHash: string;
    smartEnhancerService: SmartEnhancerService;
    catModel: any; // mongoose model
  }) => {
    const { dto, record, userId, txHash, smartEnhancerService, catModel } =
      args;

    const originalPrompt = dto.prompt ?? '';
    const productImage = dto.image;
    if (!productImage) throw new BadRequestException('缺少 image（产品图）');

    if (!dto.sound_effect_prompt)
      throw new BadRequestException('缺少 sound_effect_prompt');
    if (!dto.bgm_prompt) throw new BadRequestException('缺少 bgm_prompt');

    // 可选智能优化
    let videoPrompt = originalPrompt;
    let startFrame = productImage;

    if (dto.enableSmartEnhance) {
      const r = await smartEnhancerService.runTest(
        originalPrompt,
        productImage,
      );
      videoPrompt = r?.finalOutput?.videoPrompt ?? originalPrompt;
      startFrame = r?.finalOutput?.startFrame ?? productImage;
    }

    // 提交 LTX
    const { submitLtx } = useCommercialPipeline();
    const ltxId = await submitLtx({
      image: startFrame,
      prompt: videoPrompt,
      duration: dto.duration, // ✅ 加上（不传就走默认 5）
      seed: dto.seed,
    });

    // pipelineId：retry 用旧 requestId，保持前端轮询不变
    const pipelineId =
      record?.requestId ||
      `pipe-${txHash?.slice?.(-6) ?? 'anon'}-${Date.now()}`;

    const pipelineState = {
      stage: 'ltx_submitted',
      videoPrompt,
      startFrame,
      ltxRequestId: ltxId,
      sound_effect_prompt: dto.sound_effect_prompt,
      bgm_prompt: dto.bgm_prompt,
      asmr_mode: dto.asmr_mode ?? false,
      enableUpscale: dto.enableUpscale ?? false,
      target_resolution: dto.target_resolution ?? '4k',
    };

    if (record) {
      record.requestId = pipelineId;
      record.userId = userId;
      record.modelName = 'commercial-pipeline';
      record.prompt = originalPrompt;
      record.params = { ...dto, pipeline: pipelineState };
      record.status = 'processing';
      record.thumbUrl = startFrame;
      record.outputUrl = '';
      await record.save();
    } else {
      const newRecord = new catModel({
        requestId: pipelineId,
        userId,
        txHash,
        modelName: 'commercial-pipeline',
        prompt: originalPrompt,
        params: { ...dto, pipeline: pipelineState },
        status: 'processing',
        thumbUrl: startFrame,
        outputUrl: '',
      });
      await newRecord.save();
    }

    return { requestId: pipelineId };
  };

  return { run };
};

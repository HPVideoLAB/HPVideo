import { BadRequestException, Logger } from '@nestjs/common';
import {
  useCommercialPipeline,
  PipelineState,
} from '@/hook/useCommercialPipeline';
import { SmartEnhancerService } from '@/smart-enhancer/smart-enhancer.service';

export const useCommercialPipelineRunner = () => {
  const logger = new Logger('useCommercialPipelineRunner');

  const run = async (args: {
    dto: any;
    record: any;
    userId: string;
    txHash: string;
    smartEnhancerService: SmartEnhancerService;
    catModel: any;
  }) => {
    const { dto, record, userId, txHash, smartEnhancerService, catModel } =
      args;

    const originalPrompt = dto.prompt ?? '';
    const productImage = dto.image;

    // 校验
    if (!dto.duration) throw new BadRequestException('缺少 duration');
    if (!productImage) throw new BadRequestException('缺少 image（产品图）');

    // =================================================================
    // 🔥🔥🔥 修改核心：解析画质参数 🔥🔥🔥
    // =================================================================
    // 1. 获取前端传来的单一参数，默认为 '1080p' (即 default)
    const qualityTier = dto.enableUpscale || '1080p';

    // 2. 定义两个关键变量：
    //    baseResolution: 发给 Wan 2.6 生成视频用的 (只能是 720p 或 1080p)
    //    upscaleTarget:  发给 PipelineState 用的 (告诉 Cron Task 后续要不要超分)
    let baseResolution: '720p' | '1080p' = '1080p';
    let upscaleTarget: 'default' | '2k' | '4k' = 'default';

    switch (qualityTier) {
      case '720p':
        baseResolution = '720p';
        upscaleTarget = 'default'; // 不需要超分
        break;
      case '1080p':
      case 'default':
        baseResolution = '1080p';
        upscaleTarget = 'default'; // 不需要超分
        break;
      case '2k':
        baseResolution = '1080p'; // 2K 基于 1080p 底片
        upscaleTarget = '2k'; // 需要超分到 2K
        break;
      case '4k':
        baseResolution = '1080p'; // 4K 基于 1080p 底片
        upscaleTarget = '4k'; // 需要超分到 4K
        break;
      default:
        baseResolution = '1080p';
        upscaleTarget = 'default';
    }

    const pipelineId =
      record?.requestId ||
      `pipe-${txHash?.slice?.(-6) ?? 'anon'}-${Date.now()}`;

    // ✅ 使用解析后的 upscaleTarget 初始化状态
    const pipelineStateBase: PipelineState = {
      stage: 'wan_submitted',
      videoPrompt: '',
      startFrame: null,
      wanRequestId: '',
      enableUpscale: upscaleTarget, // 🔥 这里存真正的超分指令
    };

    try {
      // 1) Smart Enhancer
      const enableOpt = dto.enableSmartEnhance !== false;

      const r = await smartEnhancerService.runTest(
        originalPrompt,
        productImage,
        enableOpt,
        dto.voice_id,
        dto.duration, // 👈 ✅ [关键] 必须把 DTO 里的时长传进去！
      );

      const finalPrompt = r.finalOutput.videoPrompt;
      const startFrame = r.finalOutput.startFrame;

      // 2) 提交给 Wan 2.6
      const { submitWan } = useCommercialPipeline();
      const wanId = await submitWan({
        image: startFrame as any,
        prompt: finalPrompt,
        seed: dto.seed,
        duration: dto.duration,

        // 🔥 这里使用解析出来的 baseResolution (720p 或 1080p)
        resolution: baseResolution,

        negative_prompt: dto.negative_prompt,
        shot_type: dto.shot_type,
      });

      const pipelineState: PipelineState = {
        ...pipelineStateBase,
        stage: 'wan_submitted',
        videoPrompt: finalPrompt,
        startFrame,
        wanRequestId: wanId,

        // 🔥 再次确认这里存的是 upscaleTarget ('default'/'2k'/'4k')
        // 这样你的 Cron Task 逻辑不用改，它只认 default/2k/4k
        enableUpscale: upscaleTarget,
      };

      // 3) 存库
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
    } catch (e: any) {
      // ... 错误处理逻辑保持不变 ...
      const errMsg = e?.message || 'Unknown error';
      logger.error(`[Commercial Pipeline] 启动失败: ${errMsg}`);

      const failedPipelineState: PipelineState = {
        ...pipelineStateBase,
        stage: 'completed_with_error',
        error: errMsg,
      };

      if (record) {
        record.requestId = pipelineId;
        record.userId = userId;
        record.modelName = 'commercial-pipeline';
        record.prompt = originalPrompt;
        record.params = { ...dto, pipeline: failedPipelineState };
        record.status = 'failed';
        record.outputUrl = '';
        if (!record.thumbUrl) record.thumbUrl = '';
        await record.save();
      } else {
        const newRecord = new catModel({
          requestId: pipelineId,
          userId,
          txHash,
          modelName: 'commercial-pipeline',
          prompt: originalPrompt,
          params: { ...dto, pipeline: failedPipelineState },
          status: 'failed',
          thumbUrl: '',
          outputUrl: '',
        });
        await newRecord.save();
      }

      throw new BadRequestException(
        `服务提交失败 (${errMsg})，凭证已记录，请稍后点击“重试”按钮。`,
      );
    }
  };

  return { run };
};

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
    sseConnectionManager?: any; // 🔥 新增：SSE 连接管理器
  }) => {
    const { dto, record, userId, txHash, smartEnhancerService, catModel, sseConnectionManager } =
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

    // 🔥🔥🔥 关键修改：先创建数据库记录并返回 requestId，然后异步处理 🔥🔥🔥
    try {
      // 1. 先创建数据库记录（状态为 processing）
      if (record) {
        record.requestId = pipelineId;
        record.userId = userId;
        record.modelName = 'commercial-pipeline';
        record.prompt = originalPrompt;
        record.params = { ...dto, pipeline: pipelineStateBase };
        record.status = 'processing';
        record.thumbUrl = productImage; // 先用原图作为缩略图
        record.outputUrl = '';
        await record.save();
      } else {
        const newRecord = new catModel({
          requestId: pipelineId,
          userId,
          txHash,
          modelName: 'commercial-pipeline',
          prompt: originalPrompt,
          params: { ...dto, pipeline: pipelineStateBase },
          status: 'processing',
          thumbUrl: productImage, // 先用原图作为缩略图
          outputUrl: '',
        });
        await newRecord.save();
      }

      // 2. 立即返回 requestId 给前端
      logger.log(`[Commercial Pipeline] 任务已创建: ${pipelineId}，开始后台处理`);

      // 3. 在后台异步处理（不阻塞响应）
      setImmediate(async () => {
        try {
          // 🔥 发送 SSE 状态更新：开始处理
          if (sseConnectionManager) {
            sseConnectionManager.sendStatusUpdate(pipelineId, {
              status: 'processing',
              stage: 'enhancing',
              message: 'Optimizing prompt and generating start frame...',
              requestId: pipelineId,
            });
          }

          // Smart Enhancer
          const enableOpt = dto.enableSmartEnhance !== false;

          const r = await smartEnhancerService.runTest(
            originalPrompt,
            productImage,
            enableOpt,
            dto.voice_id,
            dto.duration,
          );

          const finalPrompt = r.finalOutput.videoPrompt;
          const startFrame = r.finalOutput.startFrame;

          // 🔥 发送 SSE 状态更新：开始提交视频生成
          if (sseConnectionManager) {
            sseConnectionManager.sendStatusUpdate(pipelineId, {
              status: 'processing',
              stage: 'submitting',
              message: 'Submitting video generation task...',
              requestId: pipelineId,
            });
          }

          // 提交给 Wan 2.6
          const { submitWan } = useCommercialPipeline();
          const wanId = await submitWan({
            image: startFrame as any,
            prompt: finalPrompt,
            seed: dto.seed,
            duration: dto.duration,
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
            enableUpscale: upscaleTarget,
          };

          // 更新数据库
          const taskRecord = await catModel.findOne({ requestId: pipelineId });
          if (taskRecord) {
            taskRecord.params = { ...dto, pipeline: pipelineState };
            taskRecord.thumbUrl = startFrame;
            await taskRecord.save();
            logger.log(`[Commercial Pipeline] 任务 ${pipelineId} 已提交到 Wan 2.6: ${wanId}`);

            // 🔥 发送 SSE 状态更新：视频生成中
            if (sseConnectionManager) {
              sseConnectionManager.sendStatusUpdate(pipelineId, {
                status: 'processing',
                stage: 'generating',
                message: 'Video generation in progress...',
                requestId: pipelineId,
              });
            }
          }
        } catch (e: any) {
          const errMsg = e?.message || 'Unknown error';
          logger.error(`[Commercial Pipeline] 后台处理失败: ${errMsg}`);

          const failedPipelineState: PipelineState = {
            ...pipelineStateBase,
            stage: 'completed_with_error',
            error: errMsg,
          };

          // 更新为失败状态
          const taskRecord = await catModel.findOne({ requestId: pipelineId });
          if (taskRecord) {
            taskRecord.params = { ...dto, pipeline: failedPipelineState };
            taskRecord.status = 'failed';
            await taskRecord.save();
            logger.error(`[Commercial Pipeline] 任务 ${pipelineId} 标记为失败`);

            // 🔥 通过 SSE 推送失败事件
            if (sseConnectionManager) {
              sseConnectionManager.sendEvent(pipelineId, 'failed', {
                id: pipelineId,
                status: 'failed',
                error: errMsg,
                modelName: 'commercial-pipeline',
                prompt: originalPrompt,
              });
            }
          }
        }
      });

      // 立即返回 requestId
      return { requestId: pipelineId };
    } catch (e: any) {
      // 只有数据库操作失败才会到这里
      const errMsg = e?.message || 'Unknown error';
      logger.error(`[Commercial Pipeline] 创建任务失败: ${errMsg}`);

      throw new BadRequestException(
        `任务创建失败 (${errMsg})，请稍后重试。`,
      );
    }
  };
  let a = {
    prompt:
      "15s premium cinematic product commercial, image-to-video. Maintain the cup exactly as in the reference image (no changes to design, color, material, logo, texture). Setting stays minimal: modern tabletop, soft neutral background, controlled reflections. Camera style: smooth dolly, arc moves, rack focus, macro close-ups, motivated transitions (parallax slide, subtle whip-pan). Color grade: clean commercial with gentle warm highlights, soft vignette.\n\nBGM (0-15s): upbeat modern lo-fi pop with bright plucks, light kick, soft claps, and warm bass; energetic but classy.\nSFX (throughout): soft studio room tone, subtle cloth movement, gentle fingertip taps, micro “whoosh” transitions, ceramic/metallic contact sounds only if contact is shown, light sparkle accent on hero reveal.\n\n0-3s (Hook): Extreme close-up macro glide across the cup’s surface and edge, shallow DOF, highlights roll smoothly as camera dolly-slides left-to-right. Rack focus reveals the cup’s key visual area. SFX: tiny airy whoosh + soft sparkle. The character @[Energetic, bright, youthful male voice, college student vibe, friendly, sunny and optimistic, clear articulation.] says '第一眼就很心动，这 个杯子也太有质感了吧！'\n\n3-6s (Lifestyle touch): Cut via subtle parallax wipe to a medium close-up. A young Asian male (20-26, clean casual campus style) enters frame; only hands and lower face briefly visible to keep product primary. He gently picks up the cup (no twisting or actions that imply features not visible). Camera: slow dolly-in with slight arc around the cup in his hand; background stays soft and uncluttered. SFX: soft hand movement, faint fabric rustle. Dialogue continues: '拿在手里刚刚好，日常上课、通勤都很搭。'\n\n6-9s (Detail hero): Macro detail sequence: top-down then low-angle close-up, rack focus between rim and body; controlled specular highlights, crisp edges. Transition: micro whip-pan that lands on a stable hero close-up. SFX: gentle whoosh. Dialogue: '细节做得很到位，看着干净利落，越看越喜欢。'\n\n9-12s (Use moment): Medium shot at a bright desk scene. He sets the cup down carefully on the tabletop; camera follows with a stabilized tilt-down and slight push-in to a hero resting position. Keep actions neutral—no visible liquid if not shown in reference. SFX: soft, satisfying “tap” on table + room tone. Dialogue: '不管放在书桌还是办公室，一摆上就很有氛围。'\n\n12-15s (Final hero + CTA): Final hero frame: cup centered, slow dolly-in, subtle rotating light sweep to accent contours; background gradient clean with negative space for brand text (no new logos added). End on a crisp still-like hold. SFX: gentle rising whoosh + soft sparkle accent on final frame. Dialogue: '想要高级感和实用兼顾，就选它——现在就去看看！' Keep the product exactly as in the reference image.",
    image:
      'https://d2p7pge43lyniu.cloudfront.net/output/3cbaefcc-0822-4c4f-8cc8-9c3a91027f1d.png',
    duration: 15,
    ratio: '16:9',
    resolution: '720p',
    seed: -1,
  };
  return { run };
};

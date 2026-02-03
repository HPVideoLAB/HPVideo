import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LargeMode,
  LargeModeDocument,
} from '@/large-language-model/schemas/creatimg-schema';
import { useVideoUpscalerPro } from '@/hook/useVideoUpscalerPro';
import { useCommercialPipeline } from '@/hook/useCommercialPipeline';
import { SSEConnectionManager } from '@/large-language-model/sse-connection.manager';

@Injectable()
export class CommercialPipelineTask {
  private readonly logger = new Logger(CommercialPipelineTask.name);

  private isCheckingWan = false;
  private isCheckingUpscale = false;

  constructor(
    @InjectModel(LargeMode.name)
    private readonly largeModeModel: Model<LargeModeDocument>,
    private readonly sseConnectionManager: SSEConnectionManager,
  ) {}

  // ========================================================
  // 1. 监工 A: 盯着 Wan 2.6
  // ========================================================
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkWanGenerationStatus() {
    if (this.isCheckingWan) return;
    this.isCheckingWan = true;

    try {
      // 优化点：一次查 20 个，避免积压
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: 'commercial-pipeline',
          'params.pipeline.stage': 'wan_submitted',
          status: 'processing',
        })
        .limit(20);

      if (pendingTasks.length === 0) {
        this.isCheckingWan = false;
        return;
      }

      const { getWanResult } = useCommercialPipeline();
      const { submitUpscalerTask } = useVideoUpscalerPro();

      this.logger.log(
        `[Wan Check] 批量扫描 ${pendingTasks.length} 个任务状态...`,
      );

      // 优化点：使用 Promise.allSettled 并发查询，互不阻塞
      await Promise.allSettled(
        pendingTasks.map(async (task) => {
          try {
            const pipelineState = task.params.pipeline;
            const wanId = pipelineState.wanRequestId;

            // 🔥🔥🔥 核心修复：防止误杀重试任务 🔥🔥🔥
            // 如果是重试任务，createdAt 会很久远，导致立刻超时。
            // 所以优先使用 updatedAt (最后更新时间) 来判断“当前这轮”是否超时。
            // (注意：前提是你的 Schema 开启了 timestamps: true)
            const lastActiveTime =
              (task as any).updatedAt || (task as any).createdAt || new Date();
            const now = new Date();
            const ageInMinutes =
              (now.getTime() - lastActiveTime.getTime()) / 1000 / 60;

            // 1. 检查提交阶段超时 (没有 wanRequestId 且超过 10 分钟)
            // 这种通常是 OpenAI 挂了或者 Runner 里的逻辑卡死了
            if (!wanId && ageInMinutes > 10) {
              this.logger.warn(
                `[Timeout] Task ${task.requestId} stuck in submission phase for ${Math.round(ageInMinutes)} mins. Marking as failed.`,
              );

              task.status = 'failed';
              task.params.pipeline.error =
                'Task submission timed out (OpenAI or Network issue)';
              task.params.pipeline.stage = 'completed_with_error';
              task.markModified('params');
              await task.save();

              // 🔥 Push SSE error event
              this.sseConnectionManager.sendError(task.requestId, {
                message: 'Task submission timed out',
                requestId: task.requestId,
              });
              return;
            }

            // 如果连 wanId 都没有，就不去查 Wavespeed 了，直接跳过等下次 (或等上面的超时杀掉)
            if (!wanId) return;

            const wanResult = await getWanResult(wanId);

            if (wanResult.status === 'SUCCEEDED') {
              const rawVideoUrl = wanResult.outputUrl;
              if (!rawVideoUrl) {
                task.status = 'failed';
                task.params.pipeline.error = 'No output URL';
                await task.save();

                this.sseConnectionManager.sendError(task.requestId, {
                  message: 'No output URL from Wan 2.6',
                  requestId: task.requestId,
                });
                return;
              }

              this.logger.log(`[Success] Wan 2.6 完成: ${task.requestId}`);

              const upscale = pipelineState.enableUpscale;

              if (upscale && upscale !== 'default') {
                // 进入 Upscale 流程
                const upscaleId = await submitUpscalerTask({
                  video: rawVideoUrl,
                  target_resolution: upscale,
                });
                task.params.pipeline.stage = 'upscaling';
                task.params.pipeline.wanOutputUrl = rawVideoUrl;
                task.params.pipeline.upscaleRequestId = upscaleId;

                this.sseConnectionManager.sendStatusUpdate(task.requestId, {
                  status: 'processing',
                  stage: 'upscaling',
                  message: 'Video generation completed, starting upscaling',
                  requestId: task.requestId,
                });
              } else {
                // 任务直接完成
                task.params.pipeline.stage = 'completed';
                task.outputUrl = rawVideoUrl;
                task.status = 'completed';
              }
              task.markModified('params');
              await task.save();

              if (!upscale || upscale === 'default') {
                this.sseConnectionManager.sendCompletion(task.requestId, {
                  id: task.requestId,
                  status: task.status,
                  resultUrl: task.outputUrl,
                  thumbUrl: task.thumbUrl,
                  modelName: task.modelName,
                  prompt: task.prompt,
                });
              }
            } else if (wanResult.status === 'FAILED') {
              this.logger.error(`[Failed] Wan 2.6 失败: ${task.requestId}`);
              task.status = 'failed';
              task.params.pipeline.error = wanResult.errorMessage;
              task.params.pipeline.stage = 'completed_with_error';
              task.markModified('params');
              await task.save();

              this.sseConnectionManager.sendError(task.requestId, {
                message: wanResult.errorMessage || 'Wan 2.6 generation failed',
                requestId: task.requestId,
              });
            } else if (wanResult.status === 'UNKNOWN') {
              // 🔥 UNKNOWN 超时逻辑
              if (ageInMinutes > 60) {
                // 放宽到 60 分钟，因为 Wan 2.6 很慢
                this.logger.error(
                  `[Timeout] Task ${task.requestId} UNKNOWN state for ${Math.round(ageInMinutes)} mins.`,
                );
                task.status = 'failed';
                task.params.pipeline.error =
                  wanResult.errorMessage || 'Task timeout or API error';
                task.params.pipeline.stage = 'completed_with_error';
                task.markModified('params');
                await task.save();

                this.sseConnectionManager.sendError(task.requestId, {
                  message: 'Task timeout or API error',
                  requestId: task.requestId,
                });
              }
            } else if (wanResult.status === 'RUNNING') {
              // 🔥 RUNNING 超时逻辑
              if (ageInMinutes > 60) {
                // 放宽到 60 分钟
                this.logger.error(
                  `[Timeout] Task ${task.requestId} RUNNING for ${Math.round(ageInMinutes)} mins.`,
                );
                task.status = 'failed';
                task.params.pipeline.error =
                  'Task timeout: exceeded maximum processing time';
                task.params.pipeline.stage = 'completed_with_error';
                task.markModified('params');
                await task.save();

                this.sseConnectionManager.sendError(task.requestId, {
                  message: 'Task timeout: exceeded maximum processing time',
                  requestId: task.requestId,
                });
              }
            }
          } catch (innerErr) {
            this.logger.error(
              `Task ${task.requestId} check error: ${innerErr.message}`,
            );
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Cron Wan 监工异常: ${err.message}`);
    } finally {
      this.isCheckingWan = false;
    }
  }

  // ========================================================
  // 2. 监工 B: 盯着 Upscale
  // ========================================================
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkUpscaleStatus() {
    if (this.isCheckingUpscale) return;
    this.isCheckingUpscale = true;

    try {
      const scalingTasks = await this.largeModeModel
        .find({
          modelName: 'commercial-pipeline',
          'params.pipeline.stage': 'upscaling',
          status: 'processing',
        })
        .limit(20);

      if (scalingTasks.length === 0) {
        this.isCheckingUpscale = false;
        return;
      }

      const { getResult } = useVideoUpscalerPro();

      await Promise.allSettled(
        scalingTasks.map(async (task) => {
          try {
            // 这里也可以加上类似的超时逻辑，不过 Upscale 很快，不加也行
            // 为了稳妥，如果你想加，也可以加上 ageInMinutes > 10 的判断

            const upscaleId = task.params.pipeline.upscaleRequestId;
            const result = await getResult(upscaleId);

            if (result.status === 'completed') {
              const finalUrl = result.resultUrl;
              if (finalUrl) {
                task.outputUrl = finalUrl;
                task.status = 'completed';
              } else {
                task.outputUrl = task.params.pipeline.wanOutputUrl; // 兜底
                task.status = 'completed';
              }
              task.params.pipeline.stage = 'completed';
              task.markModified('params');
              await task.save();

              this.sseConnectionManager.sendCompletion(task.requestId, {
                id: task.requestId,
                status: task.status,
                resultUrl: task.outputUrl,
                thumbUrl: task.thumbUrl,
                modelName: task.modelName,
                prompt: task.prompt,
              });
            } else if (result.status === 'failed') {
              // 降级策略
              task.outputUrl = task.params.pipeline.wanOutputUrl;
              task.status = 'completed';
              task.params.pipeline.stage = 'completed_with_error';
              task.markModified('params');
              await task.save();

              this.sseConnectionManager.sendCompletion(task.requestId, {
                id: task.requestId,
                status: task.status,
                resultUrl: task.outputUrl,
                thumbUrl: task.thumbUrl,
                modelName: task.modelName,
                prompt: task.prompt,
                warning: 'Upscaling failed, using original video',
              });
            }
          } catch (innerErr) {
            this.logger.error(
              `Upscale check error ${task.requestId}: ${innerErr.message}`,
            );
          }
        }),
      );
    } catch (err) {
      this.logger.error(`Cron Upscale 监工异常: ${err.message}`);
    } finally {
      this.isCheckingUpscale = false;
    }
  }
}

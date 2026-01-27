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

@Injectable()
export class CommercialPipelineTask {
  private readonly logger = new Logger(CommercialPipelineTask.name);

  // 状态锁，防止任务堆叠
  private isCheckingWan = false;
  private isCheckingUpscale = false;

  constructor(
    @InjectModel(LargeMode.name)
    private readonly largeModeModel: Model<LargeModeDocument>,
  ) {}

  // ========================================================
  // 1. 监工 A: 盯着 Wan 2.6 (生成视频)
  // ========================================================
  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkWanGenerationStatus() {
    // 心跳日志：证明定时器活着 (为了不刷屏，可以只在 Busy=true 时打印，或者保留调试)
    // this.logger.debug(`[Heartbeat] Wan监工扫描中... (Busy: ${this.isCheckingWan})`);

    if (this.isCheckingWan) return;
    this.isCheckingWan = true;

    try {
      // 1. 捞出正在等待 Wan 生成的任务
      const pendingTasks = await this.largeModeModel
        .find({
          modelName: 'commercial-pipeline',
          'params.pipeline.stage': 'wan_submitted', // 👈 关键：只查这个阶段
          status: 'processing',
        })
        .limit(5); // 一次处理5个

      if (pendingTasks.length === 0) {
        // 没任务，直接下班
        this.isCheckingWan = false;
        return;
      }

      const { getWanResult } = useCommercialPipeline();
      const { submitUpscalerTask } = useVideoUpscalerPro();

      this.logger.log(
        `[Wan Check] 发现 ${pendingTasks.length} 个任务正在生成中...`,
      );

      for (const task of pendingTasks) {
        try {
          const pipelineState = task.params.pipeline;
          const wanId = pipelineState.wanRequestId;

          // 2. 去阿里云查状态
          const wanResult = await getWanResult(wanId);

          // 🔥🔥🔥 关键调试日志：打印真实状态 🔥🔥🔥
          this.logger.debug(
            `>>> [Task Check] ID: ${task.requestId} | WanID: ${wanId} | 状态: ${wanResult.status} | 错误: ${wanResult.errorMessage || '无'}`,
          );

          if (wanResult.status === 'SUCCEEDED') {
            // --- 成功分支 ---
            const rawVideoUrl = wanResult.outputUrl;

            // 防御性检查：成功了但没链接
            if (!rawVideoUrl) {
              this.logger.error(`任务显示成功但无URL: ${task.requestId}`);
              task.status = 'failed';
              task.params.pipeline.error = 'No output URL from provider';
              await task.save();
              continue;
            }

            const generatedVideoUrl: string = rawVideoUrl;
            this.logger.log(`[Task] Wan 2.6 生成成功: ${task.requestId}`);

            const upscale = pipelineState.enableUpscale; // 'default' | '2k' | '4k'

            if (upscale && upscale !== 'default') {
              const target = upscale; // '2k' | '4k'
              const upscaleId = await submitUpscalerTask({
                video: generatedVideoUrl,
                target_resolution: target,
              });

              task.params.pipeline.stage = 'upscaling';
              task.params.pipeline.wanOutputUrl = generatedVideoUrl;
              task.params.pipeline.upscaleRequestId = upscaleId;
            } else {
              task.params.pipeline.stage = 'completed';
              task.outputUrl = generatedVideoUrl;
              task.status = 'completed';
            }

            // 保存数据库
            task.markModified('params');
            await task.save();
          } else if (wanResult.status === 'FAILED') {
            // --- 失败分支 ---
            this.logger.error(`[Task] Wan 2.6 生成失败: ${task.requestId}`);
            task.status = 'failed';
            task.params.pipeline.error =
              wanResult.errorMessage || 'Unknown error';
            await task.save();
          }
          // 如果是 RUNNING 或 PENDING，什么都不做，等下一次轮询
        } catch (innerErr) {
          this.logger.error(
            `单任务处理异常 [${task.requestId}]: ${innerErr.message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Cron Wan 监工异常: ${err.message}`);
    } finally {
      this.isCheckingWan = false;
    }
  }

  // ========================================================
  // 2. 监工 B: 盯着 Upscaler (画质增强)
  // ========================================================
  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkUpscaleStatus() {
    if (this.isCheckingUpscale) return;
    this.isCheckingUpscale = true;

    try {
      // 1. 捞出正在增强的任务
      const scalingTasks = await this.largeModeModel
        .find({
          modelName: 'commercial-pipeline',
          'params.pipeline.stage': 'upscaling', // 👈 查这个阶段
          status: 'processing',
        })
        .limit(5);

      if (scalingTasks.length === 0) {
        this.isCheckingUpscale = false;
        return;
      }

      const { getResult } = useVideoUpscalerPro();

      for (const task of scalingTasks) {
        try {
          const upscaleId = task.params.pipeline.upscaleRequestId;

          // 查 Wavespeed 结果
          const result = await getResult(upscaleId);

          // 调试日志
          // this.logger.debug(`[Upscale Check] ${task.requestId} State: ${result.status}`);

          if (result.status === 'completed') {
            const finalUrl = result.resultUrl;

            if (!finalUrl) {
              this.logger.warn(`增强显示完成但无URL，回退原视频`);
              task.params.pipeline.stage = 'completed_with_error';
              task.outputUrl = task.params.pipeline.wanOutputUrl;
              task.status = 'completed';
            } else {
              this.logger.log(`[Task] 🎉 画质增强完成: ${task.requestId}`);
              task.params.pipeline.stage = 'completed';
              task.outputUrl = finalUrl; // 最终 4K 视频
              task.status = 'completed';
            }

            task.markModified('params');
            await task.save();
          } else if (result.status === 'failed') {
            this.logger.warn(
              `[Task] 画质增强失败 (${result.error})，回退原视频`,
            );
            // 增强失败不算任务彻底失败，给用户原视频即可
            task.params.pipeline.stage = 'completed_with_error';
            task.outputUrl = task.params.pipeline.wanOutputUrl;
            task.status = 'completed';

            task.markModified('params');
            await task.save();
          }
        } catch (innerErr) {
          this.logger.error(
            `Upscale Task Error [${task.requestId}]: ${innerErr.message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Cron Upscale 监工异常: ${err.message}`);
    } finally {
      this.isCheckingUpscale = false;
    }
  }
}

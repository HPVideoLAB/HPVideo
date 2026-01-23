import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LargeMode, LargeModeDocument } from './schemas/creatimg-schema';
import { usePika } from '@/hook/usepika';
import { useWan } from '@/hook/useWan';
import { useSam3 } from '@/hook/useSam3';
import { useLtx2 } from '@/hook/useLtx2';

@Injectable()
export class LargeLanguageModelService {
  private readonly logger = new Logger(LargeLanguageModelService.name);

  constructor(
    @InjectModel(LargeMode.name) private catModel: Model<LargeModeDocument>,
  ) {}

  // =======================================================
  // 1. 创建逻辑：安全校验 -> 调用 Hook -> 存库(含失败状态)
  // =======================================================
  async create(createCatDto: CreateLargeLanguageModelDto, userId: string) {
    // 强制类型断言，获取 DTO 中的 txHash (假设你已经在 DTO 里加了这个字段)
    const { txHash, model } = createCatDto as any;

    // 🛡️ [第一道防线] 幂等性检查：查库看这个 Hash 用过没
    let record = await this.catModel.findOne({ txHash });

    if (record) {
      // A. 如果之前的任务正在跑或者成功了，直接拦截（防止重放攻击）
      if (record.status === 'processing' || record.status === 'completed') {
        throw new BadRequestException('该支付凭证已使用，请勿重复提交');
      }
      // B. 如果之前的状态是 failed，允许“原地复活” (Retry)
      // 逻辑自动往下走，跳过下面的 else 链上检查
      this.logger.log(`Retrying failed task for hash: ${txHash}`);
    } else {
      // 🛡️ [第二道防线] 链上验证 (如果是新 Hash)
      // TODO: 在这里调用 verifyTransaction(txHash) 验证金额和接收方
      if (!txHash) throw new BadRequestException('支付凭证丢失');
    }

    let requestId: string;
    let thumbUrl = '';
    let finalStatus: 'processing' | 'failed' = 'processing';
    let errorMsg = '';

    // --- A. 尝试调用第三方 API (包裹在 Try/Catch 中) ---
    try {
      // throw new Error('模拟第三方报错: Insufficient credits. Please top up.');
      switch (model) {
        case 'pika':
          const { submitTask: submitPika } = usePika();
          requestId = await submitPika({
            prompt: createCatDto.prompt,
            images: createCatDto.images!,
            resolution: createCatDto.resolution,
            seed: createCatDto.seed,
            transitions: createCatDto.transitions,
          });
          thumbUrl = createCatDto.images?.[0] || '';
          break;

        case 'wan-2.1':
          const { submitWanTask } = useWan();
          requestId = await submitWanTask({
            video: createCatDto.video!,
            prompt: createCatDto.prompt,
            negative_prompt: createCatDto.negative_prompt,
            loras: createCatDto.loras,
            strength: createCatDto.strength,
            num_inference_steps: createCatDto.num_inference_steps,
            duration: createCatDto.duration,
            guidance_scale: createCatDto.guidance_scale,
            flow_shift: createCatDto.flow_shift,
            seed: createCatDto.seed,
          });
          thumbUrl = createCatDto.video || '';
          break;

        case 'sam3':
          const { submitSam3Task } = useSam3();
          requestId = await submitSam3Task({
            video: createCatDto.video!,
            prompt: createCatDto.prompt,
            apply_mask: createCatDto.apply_mask,
          });
          thumbUrl = createCatDto.video || '';
          break;
        // 🔥🔥🔥【新增】LTX-2 19b 逻辑 🔥🔥🔥
        case 'ltx-2-19b': {
          const { submitLtx2Task } = useLtx2();
          requestId = await submitLtx2Task({
            image: createCatDto.image!, // 只取 DTO 里的 image
            prompt: createCatDto.prompt, // 和 prompt
            seed: createCatDto.seed, // 种子可选
            // resolution: 1080p 已在 Hook 内部写死，无需在此传递
          });
          thumbUrl = createCatDto.image || ''; // 缩略图就是原图
          break;
        }

        default:
          throw new BadRequestException('不支持的模型类型');
      }
    } catch (error) {
      // 🛑 [关键逻辑] 捕获失败：即使 API 挂了，也要记录入库，但标记为 failed
      this.logger.error(`Submit Error: ${error.message}`);
      finalStatus = 'failed';
      errorMsg = error.message || 'Unknown error';
      // 生成一个临时 ID 以满足 Schema 的 unique 约束，防止存库失败
      requestId = `err-${txHash.slice(-6)}-${Date.now()}`;
    }

    // --- B. 存入 MongoDB (支持新建或更新) ---
    if (record) {
      // 这种情况是“重试”：更新旧的 failed 记录
      record.requestId = requestId; // 更新为新的 ID (或错误占位符)
      record.status = finalStatus;
      record.modelName = model;
      record.params = createCatDto;
      if (thumbUrl) record.thumbUrl = thumbUrl;
      // 记得清空之前的 outputUrl
      record.outputUrl = '';
      await record.save();
    } else {
      // 这种情况是“新单”：创建新记录
      const newRecord = new this.catModel({
        requestId,
        userId,
        txHash, // 🔥 存入 Hash 作为凭证
        modelName: model,
        prompt: createCatDto.prompt,
        params: createCatDto,
        status: finalStatus, // 可能是 processing，也可能是 failed
        thumbUrl,
        outputUrl: '',
      });
      await newRecord.save();
    }

    this.logger.log(`Task processed: ${requestId}, Status: ${finalStatus}`);

    // 🔥 如果最终状态是失败，抛出异常告知前端 (前端接到 400 会保留 Hash)
    if (finalStatus === 'failed') {
      throw new BadRequestException(
        `服务提交失败 (${errorMsg})，凭证已记录，请稍后点击“重试”按钮（无需重新支付）。`,
      );
    }

    return { requestId };
  }

  // =======================================================
  // 2. 轮询逻辑 (保持不变)
  // =======================================================
  async findOne(id: string) {
    const record = await this.catModel.findOne({ requestId: id });

    // 优化：已终结状态直接返回
    if (
      record &&
      (record.status === 'completed' || record.status === 'failed')
    ) {
      return {
        id: record.requestId,
        status: record.status,
        resultUrl: record.outputUrl,
        raw: { status: record.status },
      };
    }

    // 调用 API 查询 (假设 pika 接口通用)
    const { getResult } = usePika();
    let apiResult;
    try {
      apiResult = await getResult(id);
    } catch (e) {
      throw e;
    }

    // 同步状态
    if (record) {
      if (apiResult.status === 'completed') {
        record.status = 'completed';
        record.outputUrl = apiResult.resultUrl;
        await record.save();
      } else if (apiResult.status === 'failed') {
        record.status = 'failed';
        await record.save();
      }
    }

    return apiResult;
  }

  // =======================================================
  // 3. 获取历史 (保持不变)
  // =======================================================
  async findAllByUser(userId: string) {
    if (!userId || userId === 'anonymous') return [];
    return this.catModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}

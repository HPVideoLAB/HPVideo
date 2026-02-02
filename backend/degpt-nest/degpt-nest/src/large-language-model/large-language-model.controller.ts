import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Headers,
  Logger,
} from '@nestjs/common';
import { LargeLanguageModelService } from './large-language-model.service';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import { SSEConnectionManager } from './sse-connection.manager';
import type { Response } from 'express';

@Controller('large-language-model')
export class LargeLanguageModelController {
  private readonly logger = new Logger(LargeLanguageModelController.name);

  constructor(
    private readonly largeLanguageModelService: LargeLanguageModelService,
    private readonly sseConnectionManager: SSEConnectionManager,
  ) {}

  // =======================================================
  // 1. 创建任务 (原有接口，新增 Header 获取用户ID)
  // =======================================================
  @Post()
  create(
    @Body() createLargeLanguageModelDto: CreateLargeLanguageModelDto,
    @Headers('x-wallet-address') walletAddress: string, // 🔥 新增：获取钱包地址
  ) {
    // 兼容逻辑：如果前端没传地址，默认为 anonymous，保证不报错
    const userId = walletAddress || 'anonymous';
    return this.largeLanguageModelService.create(
      createLargeLanguageModelDto,
      userId,
    );
  }

  // =======================================================
  // 2. 获取历史记录 (🔥 新增接口)
  // =======================================================
  @Get('history')
  getHistory(@Headers('x-wallet-address') walletAddress: string) {
    const userId = walletAddress || 'anonymous';
    return this.largeLanguageModelService.findAllByUser(userId);
  }

  // =======================================================
  // 3. 轮询结果 (原有接口，增加数据库缓存逻辑)
  // =======================================================
  @Get(':id')
  findOne(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    // 保持原有的无缓存设置
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    return this.largeLanguageModelService.findOne(id);
  }

  // =======================================================
  // 4. SSE 实时推送 (🔥 新增接口)
  // =======================================================
  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    this.logger.log(`SSE connection request for requestId: ${id}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Check if task exists
    const task = await this.largeLanguageModelService.findOne(id);
    if (!task) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Task not found' })}\n\n`);
      res.end();
      return;
    }

    // If task is already completed or failed, send final status and close
    if (task.status === 'completed' || task.status === 'failed') {
      this.logger.log(`Task ${id} already ${task.status}, sending final status`);
      res.write(`event: ${task.status}\ndata: ${JSON.stringify(task)}\n\n`);
      res.end();
      return;
    }

    // Add connection to manager
    this.sseConnectionManager.addConnection(id, res);

    // Send initial status
    res.write(`event: connected\ndata: ${JSON.stringify({ requestId: id, status: task.status })}\n\n`);

    this.logger.log(`SSE connection established for requestId: ${id}`);
  }
}

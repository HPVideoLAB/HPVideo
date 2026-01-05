import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Headers,
} from '@nestjs/common';
import { LargeLanguageModelService } from './large-language-model.service';
import { CreateLargeLanguageModelDto } from './dto/create-large-language-model.dto';
import type { Response } from 'express';

@Controller('large-language-model')
export class LargeLanguageModelController {
  constructor(
    private readonly largeLanguageModelService: LargeLanguageModelService,
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
}

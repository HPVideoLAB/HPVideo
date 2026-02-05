import { Controller, Post, Body } from '@nestjs/common';
import { SmartEnhancerService } from './smart-enhancer.service';

@Controller('smart-enhancer')
export class SmartEnhancerController {
  constructor(private readonly smartEnhancerService: SmartEnhancerService) {}

  // 智能优化提示词
  @Post('test')
  async testOptimization(
    @Body('prompt') prompt: string,
    @Body('image') image?: string,
  ) {
    return this.smartEnhancerService.runTest(prompt, image);
  }

  // openai接口
  // 🔥 [修改] 公开的标题生成接口，不需要 Token
  @Post('generate-title')
  async generateTitle(@Body('prompt') prompt: string) {
    // 强制指定使用 gpt5.2
    return this.smartEnhancerService.generateTitle(prompt);
  }
}

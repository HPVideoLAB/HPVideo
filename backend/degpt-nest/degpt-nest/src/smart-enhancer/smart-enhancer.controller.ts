import { Controller, Post, Body } from '@nestjs/common';
import { SmartEnhancerService } from './smart-enhancer.service';

@Controller('smart-enhancer')
export class SmartEnhancerController {
  constructor(private readonly smartEnhancerService: SmartEnhancerService) {}

  @Post('test')
  async testOptimization(
    @Body('prompt') prompt: string,
    @Body('image') image?: string,
  ) {
    return this.smartEnhancerService.runTest(prompt, image);
  }
}

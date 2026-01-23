// src/large-language-model/dto/modules/upscaler.ts
import { IsIn, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class UpscalerDto {
  // ✅ 单模型 upscaler 时用
  @ValidateIf((o) => o.model === 'video-upscaler-pro')
  @IsOnlyForModel(['video-upscaler-pro'])
  @IsString()
  @IsUrl()
  video?: string;

  // ✅ pipeline 也会带 target_resolution，所以允许 commercial-pipeline + 加 ValidateIf
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.model === 'video-upscaler-pro' || o.model === 'commercial-pipeline',
  )
  @IsOnlyForModel(['video-upscaler-pro', 'commercial-pipeline'])
  @IsIn(['720p', '1080p', '2k', '4k'])
  target_resolution?: '720p' | '1080p' | '2k' | '4k';
}

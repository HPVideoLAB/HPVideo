// src/large-language-model/dto/modules/upscaler.ts
import { IsIn, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class UpscalerDto {
  // 🔥 [修改点 1] video 是共享字段 (Wan/Sam3 都有)
  // 必须删掉 @IsOnlyForModel，否则会拦截 Wan/Sam3 的请求
  @ValidateIf((o) => o.model === 'video-upscaler-pro')
  // ❌ 删除这一行: @IsOnlyForModel(['video-upscaler-pro'])
  @IsString()
  @IsUrl()
  video?: string;

  // 🔥 [修改点 2] target_resolution 是共享字段 (Commercial Pipeline 也有)
  // 虽然你在 IsOnlyForModel 里写了两个模型，但如果未来加第三个模型用这个字段，又得改这里
  // 最稳妥的做法是删掉 IsOnlyForModel，只依靠 ValidateIf 来控制逻辑
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.model === 'video-upscaler-pro' || o.model === 'commercial-pipeline',
  )
  // ❌ 删除这一行: @IsOnlyForModel(['video-upscaler-pro', 'commercial-pipeline'])
  @IsIn(['720p', '1080p', '2k', '4k'])
  target_resolution?: '720p' | '1080p' | '2k' | '4k';
}

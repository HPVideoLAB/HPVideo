// src\large-language-model\dto\modules\pipeline.ts
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsOnlyForModel } from '../model-validator';

export class PipelineDto {
  // 🔥 [修改] image: 与 Wan 2.6 冲突，必须去掉 IsOnlyForModel
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsString()
  @IsUrl()
  image?: string;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline']) // 独有字段，可以保留
  @IsBoolean()
  enableSmartEnhance?: boolean;

  // Sound Effect 是独有的，可以保留 IsOnlyForModel
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  sound_effect_prompt!: string;

  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsString()
  @MaxLength(200)
  bgm_prompt!: string;

  @IsOptional()
  @IsOnlyForModel(['commercial-pipeline']) // 独有字段，可以保留
  @IsBoolean()
  asmr_mode?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  @IsOnlyForModel(['commercial-pipeline'])
  @IsBoolean()
  enableUpscale?: boolean;

  // 🔥 [修改] target_resolution: 与 Upscaler 冲突，必须去掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'commercial-pipeline')
  // ❌ 删除这一行: @IsOnlyForModel(['commercial-pipeline'])
  @IsIn(['720p', '1080p', '2k', '4k'])
  target_resolution?: '720p' | '1080p' | '2k' | '4k';
}

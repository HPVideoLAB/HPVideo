// src\large-language-model\dto\modules\wan.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsOnlyForModel } from '../model-validator';

// Wan 专属子对象 (保持不变)
export class LoraDto {
  @IsString()
  path: string;

  @IsNumber()
  scale: number;
}

export class WanDto {
  // 🔥 [修改] video: Sam3 / Upscaler 也有 -> 必须去掉 IsOnlyForModel
  @ValidateIf((o) => o.model === 'wan-2.1')
  // ❌ 删除这一行: @IsOnlyForModel(['wan-2.1'])
  @IsString()
  @IsNotEmpty()
  video?: string;

  // 🔥 [修改] duration: Commercial / Wan 2.6 都有 -> 必须去掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1')
  // ❌ 删除这一行: @IsOnlyForModel(['wan-2.1'])
  @IsInt()
  @Min(5)
  @Max(10)
  duration?: number;

  // 🔥 [修改] negative_prompt: Commercial / Wan 2.6 都有 -> 必须去掉 IsOnlyForModel
  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1') // ✅ 建议补上 ValidateIf 保持统一
  // ❌ 删除这一行: @IsOnlyForModel(['wan-2.1'])
  @IsString()
  negative_prompt?: string;

  // --- 下面这些目前是 Wan 2.1 独有的，保留 IsOnlyForModel 没问题 ---

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1') // 建议补上 ValidateIf
  @IsOnlyForModel(['wan-2.1'])
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => LoraDto)
  loras?: LoraDto[];

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1') // 建议补上 ValidateIf
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  strength?: number;

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1') // 建议补上 ValidateIf
  @IsOnlyForModel(['wan-2.1'])
  @IsInt()
  @Min(1)
  @Max(40)
  num_inference_steps?: number;

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1') // 建议补上 ValidateIf
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  @Min(0)
  @Max(20)
  guidance_scale?: number;

  @IsOptional()
  @ValidateIf((o) => o.model === 'wan-2.1') // 建议补上 ValidateIf
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  @Min(1)
  @Max(10)
  flow_shift?: number;
}

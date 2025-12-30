import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  ValidateNested,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidateIf, // 这里的 ValidateIf 主要用于必填项的条件判断
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
// 引入刚才创建的自定义校验器
import { IsOnlyForModel } from './model-validator';

// --- 1. 定义子对象 ---

export class TransitionDto {
  @IsInt()
  @Min(1)
  duration: number;

  @IsOptional()
  @IsString()
  prompt?: string;
}

export class LoraDto {
  @IsString()
  path: string;

  @IsNumber()
  scale: number;
}

// --- 2. 自定义校验器 (Pika 专属逻辑保持不变) ---
function IsValidPikaframesTransitions(options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsValidPikaframesTransitions',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const dto: any = args.object;
          if (dto.model !== 'pika') return true;

          const images = dto.images;
          if (!Array.isArray(images)) return false;
          if (value === undefined || value === null) return true;
          if (!Array.isArray(value)) return false;
          if (value.length !== Math.max(0, images.length - 1)) return false;

          let sum = 0;
          for (const t of value) {
            const d = Number(t?.duration);
            if (!Number.isFinite(d) || !Number.isInteger(d) || d < 5)
              return false;
            sum += d;
          }
          return sum <= 25;
        },
        defaultMessage(args: ValidationArguments) {
          const dto: any = args.object;
          const n = Array.isArray(dto.images) ? dto.images.length : 0;
          return `transitions 校验失败: 长度应为 ${Math.max(0, n - 1)}，且总时长 ≤ 25s`;
        },
      },
    });
  };
}

// --- 3. 核心 DTO ---

export class CreateLargeLanguageModelDto {
  // ✅ 1. 核心：模型类型
  @IsString()
  @IsNotEmpty()
  @IsIn(['pika', 'wan-2.1', 'sam3'])
  model: 'pika' | 'wan-2.1' | 'sam3';

  // ✅ 2. 全员通用参数
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  seed?: number;

  // ==========================================
  // 🟢 Pika 专属 (严禁其他模型使用)
  // ==========================================

  // Images: 仅 Pika 可用，且必填
  @ValidateIf((o) => o.model === 'pika')
  @IsOnlyForModel(['pika']) // 🔒 严格限制
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsOnlyForModel(['pika']) // 🔒 严格限制
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  @IsOptional()
  @IsOnlyForModel(['pika']) // 🔒 严格限制
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransitionDto)
  @IsValidPikaframesTransitions()
  transitions?: TransitionDto[];

  // ==========================================
  // 🔵 Wan 2.1 & SAM3 共用
  // ==========================================

  // Video: Wan 和 SAM3 必填，Pika 不可用
  @ValidateIf((o) => o.model === 'wan-2.1' || o.model === 'sam3')
  @IsOnlyForModel(['wan-2.1', 'sam3']) // 🔒 严格限制：Pika 传这个会报错
  @IsString()
  @IsNotEmpty()
  video?: string;

  // ==========================================
  // 🔵 Wan 2.1 专属 (严禁 SAM3 偷传)
  // ==========================================

  @IsOptional()
  @IsOnlyForModel(['wan-2.1']) // 🔒 只有 Wan 能传 negative_prompt
  @IsString()
  negative_prompt?: string;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1']) // 🔒 只有 Wan 能传 loras
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => LoraDto)
  loras?: LoraDto[];

  @IsOptional()
  @IsOnlyForModel(['wan-2.1']) // 🔒 只有 Wan 能传 strength
  @IsNumber()
  strength?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsInt()
  @Min(1)
  @Max(40)
  num_inference_steps?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsInt()
  @Min(5)
  @Max(10)
  duration?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  @Min(0)
  @Max(20)
  guidance_scale?: number;

  @IsOptional()
  @IsOnlyForModel(['wan-2.1'])
  @IsNumber()
  @Min(1)
  @Max(10)
  flow_shift?: number;

  // ==========================================
  // 🟣 SAM3 专属 (严禁其他模型使用)
  // ==========================================

  @IsOptional()
  @IsOnlyForModel(['sam3']) // 🔒 只有 SAM3 能传 apply_mask
  @IsBoolean()
  apply_mask?: boolean;
}

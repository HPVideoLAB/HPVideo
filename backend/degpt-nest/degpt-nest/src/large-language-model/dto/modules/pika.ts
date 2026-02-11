// C:\Users\28639\Desktop\DBC\HPVideo\backend\degpt-nest\degpt-nest\src\large-language-model\dto\modules\pika.ts
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUrl,
  IsOptional,
  IsIn,
  ValidateNested,
  ValidateIf,
  IsInt,
  Min,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';

// Pika 专属子对象 (保持不变)
export class TransitionDto {
  @IsInt()
  @Min(1)
  duration: number;

  @IsOptional()
  @IsString()
  prompt?: string;
}

// Pika 专属校验器 (保持不变)
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
          return `transitions error`;
        },
      },
    });
  };
}

export class PikaDto {
  // images 是 Pika 独有的（注意是复数），其他模型用的是 image (单数)
  @ValidateIf((o) => o.model === 'pika')
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];

  // 🔥🔥🔥 【修改点】resolution 是共享字段（Commercial/Wan2.6 也有）
  // 必须删掉 IsOnlyForModel，只保留 ValidateIf
  @IsOptional()
  @ValidateIf((o) => o.model === 'pika')
  // ❌ 删除这一行: @IsOnlyForModel(['pika'])
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  // transitions 是 Pika 独有
  @IsOptional()
  @ValidateIf((o) => o.model === 'pika')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransitionDto)
  @IsValidPikaframesTransitions()
  transitions?: TransitionDto[];
}

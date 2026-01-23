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
import { IsOnlyForModel } from '../model-validator'; // 假设校验器在上一级

// Pika 专属子对象
export class TransitionDto {
  @IsInt()
  @Min(1)
  duration: number;

  @IsOptional()
  @IsString()
  prompt?: string;
}

// Pika 专属校验器 (直接搬运)
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

export class PikaDto {
  @ValidateIf((o) => o.model === 'pika')
  @IsOnlyForModel(['pika'])
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsOnlyForModel(['pika'])
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  @IsOptional()
  @IsOnlyForModel(['pika'])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransitionDto)
  @IsValidPikaframesTransitions()
  transitions?: TransitionDto[];
}

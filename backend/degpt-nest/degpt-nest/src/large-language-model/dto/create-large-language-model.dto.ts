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
} from 'class-validator';
import { Type } from 'class-transformer';

// 单段 transition
export class TransitionDto {
  @IsInt()
  @Min(1) // 正整数秒
  duration: number;

  @IsOptional()
  @IsString()
  prompt?: string;
}

// 跨字段校验：transitions 与 images 的关系 + 总时长 <= 25
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
          const images = dto.images;

          if (!Array.isArray(images)) return false;

          // transitions 可不传
          if (value === undefined || value === null) return true;

          if (!Array.isArray(value)) return false;

          // 长度必须 = images.length - 1
          if (value.length !== Math.max(0, images.length - 1)) return false;

          // 总时长 <= 25，且 duration 为正整数
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
          return `transitions 必须满足：长度 = images.length - 1（当前 images=${n}），且每段 duration 为正整数，总和 ≤ 25 秒`;
        },
      },
    });
  };
}

export class CreateLargeLanguageModelDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images: string[];

  @IsOptional()
  @IsIn(['720p', '1080p'])
  resolution?: '720p' | '1080p';

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(2147483647)
  seed?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransitionDto)
  @IsValidPikaframesTransitions()
  transitions?: TransitionDto[];
}

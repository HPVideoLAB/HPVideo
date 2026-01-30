import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * 自定义校验器：限制字段只能在特定的 model 下使用
 * @param allowedModels 允许该字段出现的模型列表
 */
export function IsOnlyForModel(
  allowedModels: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOnlyForModel',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [allowedModels],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // 1. 如果用户没传这个参数（undefined 或 null），直接放行
          // (是否必填由 @IsNotEmpty 等其他装饰器控制)
          if (value === undefined || value === null) return true;

          // 2. 获取当前请求的 model 值
          const currentModel = (args.object as any).model;

          // 2.1 如果 model 字段本身不存在或为空，返回 false
          // 这样可以给出更清晰的错误提示
          if (!currentModel) return false;

          // 3. 获取允许的模型列表
          const [models] = args.constraints;

          // 4. 核心判断：当前 model 是否在允许列表里？
          // 如果允许列表包含当前模型，则校验通过
          return models.includes(currentModel);
        },
        defaultMessage(args: ValidationArguments) {
          const [models] = args.constraints;
          const currentModel = (args.object as any).model;

          // 如果 model 字段缺失，给出更明确的错误提示
          if (!currentModel) {
            return `参数 '${args.property}' 需要指定 model 字段! 它仅适用于: [${models.join(', ')}]`;
          }

          return `参数 '${args.property}' 不可用! 它仅适用于: [${models.join(', ')}], 但你当前的模型是 '${currentModel}'`;
        },
      },
    });
  };
}

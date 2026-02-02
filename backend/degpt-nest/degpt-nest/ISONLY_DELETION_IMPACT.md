# 删除 @IsOnlyForModel 的影响分析

## 场景对比

### 场景 1: 正确使用（model='commercial-pipeline', voice_id='xxx'）
- **保留 @IsOnlyForModel**: ✅ 验证通过
- **删除 @IsOnlyForModel**: ✅ 验证通过
- **结论**: 无影响

### 场景 2: 错误使用（model='pika', voice_id='xxx'）
- **保留 @IsOnlyForModel**: ❌ 报错 "voice_id 只能用于 commercial-pipeline"
- **删除 @IsOnlyForModel**:
  - 如果 `forbidNonWhitelisted: true`: ❌ 报错 "property voice_id should not exist"
  - 如果 `forbidNonWhitelisted: false`: ⚠️ 字段被接受，传递到 service 层（service 需要忽略）
- **结论**: 有影响，但可以通过其他方式保护

### 场景 3: 正常使用（model='pika'，不传 voice_id）
- **保留 @IsOnlyForModel**: ✅ 正常
- **删除 @IsOnlyForModel**: ✅ 正常
- **结论**: 无影响

## 推荐方案

### 方案 A: 删除所有 @IsOnlyForModel（推荐）

**优点**:
- 避免字段冲突导致的误报
- 代码更简洁
- 依靠 `@ValidateIf` 就足够了

**前提条件**:
- 保持 `forbidNonWhitelisted: true`（当前配置）
- 或者在 service 层做额外验证

**适用于**:
- ✅ 所有共享字段（image, duration, resolution 等）- **必须删除**
- ✅ 独有字段（voice_id, enableSmartEnhance 等）- **可以删除**

### 方案 B: 只删除共享字段的 @IsOnlyForModel

**优点**:
- 独有字段保留额外的验证层
- 更严格的参数检查

**缺点**:
- 可能与 `forbidNonWhitelisted: true` 冲突
- 代码不一致

## 最终建议

**删除所有 @IsOnlyForModel，包括独有字段的**

理由：
1. 你使用了 `IntersectionType` 合并所有 DTO
2. `@ValidateIf` 已经提供了足够的保护
3. `forbidNonWhitelisted: true` 会拒绝不属于当前 model 的字段
4. 避免装饰器冲突导致的复杂问题

**对逻辑的影响**: 几乎没有负面影响，反而会减少误报。

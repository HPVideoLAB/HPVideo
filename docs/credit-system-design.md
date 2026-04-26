# HPVideo 积分体系 + 计费体系设计

**作者**: PM 设计
**日期**: 2026-04-26（第二版，去 Stripe/Google）
**状态**: 草案 - 待 Review

---

## 0. 设计原则（不可妥协）

1. **永不亏钱**：每次 API 消耗 `credits charged >= 2 × API_cost_USD × 1000`（50% 毛利兜底，1000 积分 = $1）。
2. **默认积分模式**：用户唯一交互单位是"积分"，看不到链上 / API 成本细节。
3. **一键钱包，无邮箱无密码**：注册即生成 BSC 钱包，地址 = 用户 ID，无需 Google/邮箱/密码。
4. **法币购买积分通过 Creem**（复用 DeepLinkGame 的现成集成），不引入 Stripe。
5. **不做免费套餐**：服务即时收费，新用户必须先购买积分才能生成（与 DeepLinkGame 一致）。
6. **加密保留作差异化**：HPC token 任务、链上版税、DePIN GPU 退款返还到内部钱包。

---

## 1. 当前 API 实际成本（USD / 次生成）

数据来源：`backend/apps/web/ai/wave.py` 的 `amounts` dict。

| 模型 | 最便宜 | 中等 | 最贵 |
|---|---|---|---|
| ovi | 540p/5s = $0.225 | - | - |
| seedance-2.0 | 6s = $0.30 | 9s = $0.45 | 12s = $0.60 |
| hailuo-2.3 | 6s = $0.345 | - | 10s = $0.84 |
| wan-2.7 | 480p/5s = $0.375 | 720p/5s = $0.75 | 1080p/10s = $2.25 |
| vidu-q3 | 4s = $0.40 | - | 8s = $0.80 |
| ltx-2.3 | 6s = $0.54 | 8s = $0.72 | 10s = $0.90 |
| pixverse-v6 | 5s = $0.60 | - | 8s = $1.20 |
| luma-ray-2 | 5s = $0.75 | - | 10s = $1.50 |
| kling-3.0 | 5s = $2.10 | - | 10s = $4.20 |
| veo3.1 | 4s = $2.40 | 6s = $3.60 | 8s = $4.80 |

---

## 2. 积分换算规则

**1000 积分 = $1**（与 DeepLinkGame 同一比率，便于复用 Creem 产品配置）

**消耗公式**：`credits_charged = ceil(api_cost_usd × 1000) × 2`
即 2 倍 API 成本，保证 50% 毛利兜底。

### 模型 × 时长 → 积分消耗对照表

| 模型 / 配置 | API 成本 | 积分消耗 | 用户看到 |
|---|---:|---:|---:|
| **ovi 540p/5s** | $0.225 | **450** | $0.45 |
| **seedance 6s** | $0.30 | **600** | $0.60 |
| **seedance 9s** | $0.45 | **900** | $0.90 |
| **hailuo 6s** | $0.345 | **690** | $0.69 |
| **wan-2.7 480p/5s** | $0.375 | **750** | $0.75 |
| **vidu-q3 4s** | $0.40 | **800** | $0.80 |
| **ltx-2.3 6s** | $0.54 | **1,080** | $1.08 |
| **pixverse 5s** | $0.60 | **1,200** | $1.20 |
| **wan-2.7 720p/5s** | $0.75 | **1,500** | $1.50 |
| **luma-ray-2 5s** | $0.75 | **1,500** | $1.50 |
| **wan-2.7 1080p/5s** | $1.125 | **2,250** | $2.25 |
| **pixverse 8s** | $1.20 | **2,400** | $2.40 |
| **luma-ray-2 10s** | $1.50 | **3,000** | $3.00 |
| **kling-3.0 5s** | $2.10 | **4,200** | $4.20 |
| **wan-2.7 1080p/10s** | $2.25 | **4,500** | $4.50 |
| **veo3.1 4s** | $2.40 | **4,800** | $4.80 |
| **veo3.1 6s** | $3.60 | **7,200** | $7.20 |
| **kling-3.0 10s** | $4.20 | **8,400** | $8.40 |
| **veo3.1 8s** | $4.80 | **9,600** | $9.60 |

> 用户最贵一次操作（VEO 3.1 8s）= $9.60 → 单次充值 $10 包就够用一次。

---

## 3. 积分包（与 DeepLinkGame Creem 同一阶梯）

DeepLinkGame 已有的 10 档 Creem 产品价格直接复用结构（HPVideo 在 Creem 上注册自己的 product_id，价格点完全镜像）：

| 档位 | 售价 | 基础积分 | 加赠 | 总积分 | 等效单价 |
|---|---:|---:|---:|---:|---:|
| **Mini** | $5 | 5,000 | 0 | 5,000 | $0.001 |
| **Basic** | $10 | 10,000 | 0 | 10,000 | $0.001 |
| **Plus** | $15 | 15,000 | 0 | 15,000 | $0.001 |
| **Standard** | $20 | 20,000 | +1,000（5%）| 21,000 | $0.000952 |
| **Pro** | $25 | 25,000 | +1,500（6%）| 26,500 | $0.000943 |
| **Power** | $30 | 30,000 | +2,500（8.3%）| 32,500 | $0.000923 |
| **Heavy** | $35 | 35,000 | +3,500（10%）| 38,500 | $0.000909 |
| **Studio** | $40 | 40,000 | +5,000（12.5%）| 45,000 | $0.000889 |
| **Whale** | $50 | 50,000 | +7,500（15%）| 57,500 | $0.000870 |
| **Legend** | $100 | 100,000 | +30,000（30%）| 130,000 | $0.000769 |

**毛利兜底测试**（最大档 $100，130k 积分用满）:
- 130,000 积分 × $0.0005（积分实际成本：消耗时 2× 兜底后的对应 API 成本）= $65 实际 API 成本
- Creem 手续费 ~5%（$5）+ Webhook/infra ~$1
- **净毛利 $29 (29%)** ✓ 不亏

**为什么阶梯越大加赠越多**：用户预付现金流对我们最有价值，且大额用户复购周期长 → 给折扣换 retention。

**永不亏钱底线**：所有档位 effective 积分价 ≥ $0.000769，而每次消耗的实际 API 成本 ≤ 该积分零售价的 50%（兜底保证）。最坏情况毛利 23%，仍盈利。

---

## 4. 一键钱包（用户身份机制）

### 替代 Web2 登录的逻辑

不要 Google / 邮箱 / 密码。新用户进站直接：

```
hpvideo.io 首页 → 点 "立即开始" 按钮
   ↓
后端 ethers.Wallet.createRandom() 生成 BSC 钱包
   ↓
前端弹窗：
  ┌─────────────────────────────────────┐
  │  你的 HPVideo 账号已就绪            │
  │                                     │
  │  钱包地址（公开）:                  │
  │  0xABCD...1234                      │
  │                                     │
  │  私钥（请立即备份！只显示一次）:    │
  │  0xfedc... [复制] [下载 TXT]        │
  │                                     │
  │  ☐ 我已保存私钥，知道丢失无法恢复   │
  │                                     │
  │  [继续]    [用现有钱包导入]         │
  └─────────────────────────────────────┘
   ↓
前端 IndexedDB 存私钥（加密 with browser fingerprint）
   ↓
后端创建 user 记录：{ wallet_address, created_at, credits=0 }
   ↓
直接进入 /creator/，余额 0，提示"先充值才能生成"
```

### 关键决策

| 问题 | 选择 | 理由 |
|---|---|---|
| 私钥存哪 | **客户端 IndexedDB**（加密）| 真自托管；服务器看不到私钥；丢了就丢了，符合 crypto 用户预期 |
| 备份方案 | 用户自己保存（强提示，每次登录前 30 天提醒一次）| 不替用户兜底丢失，避免我们成为托管方 |
| 多设备 | 私钥导出/导入 | 用户自管，简单 |
| 重置密码 | **没有"重置"概念**，丢私钥 = 丢账号 | 同 DeepLinkGame，crypto 原生 |
| 用户害怕怎么办 | 加一个 "Email Backup" 可选项：把加密私钥发到邮箱 | 仍是用户自管，但有副本 |

### 与 DeepLinkGame 钱包的关系

- DeepLinkGame 用户的 DBC 钱包 ≠ HPVideo 用户的 BSC 钱包（不同链）
- 但**同一个私钥可在两条链上派生同一地址**（都是 secp256k1）
- 已经是 DeepLinkGame 用户的人 → 可"用现有钱包导入"，把私钥导入 HPVideo，在 BSC 上自动有同地址
- 跨产品身份联动 → 后续 cross-promo 基础

---

## 5. Creem 充值流程（复用现成集成）

### 接口复用

DeepLinkGame 现有的 endpoint:
```
POST https://nodeapi.deeplink.cloud/api/paypal/getBuyLink
Body: { id: <wallet_address>, product_id: "prod_xxx" }
Response: { buy_link: "https://creem.io/checkout/..." }
```

HPVideo 需要做：

1. **在 Creem 后台注册 10 个 HPVideo 专属产品**（`prod_hpvideo_5usd`, `prod_hpvideo_10usd`, ...）
   - 与 DeepLinkGame 产品分账（避免会计混淆）
   - 每个产品的 webhook URL 配置为：`https://hpvideo.io/api/billing/creem-webhook`

2. **HPVideo 后端新增 endpoint**：
   ```
   POST /api/billing/get-checkout-url
   Body: { tier: "10usd" }  // 5usd / 10usd / 15usd ...
   Response: { url: "https://creem.io/checkout/..." }
   ```
   实现：直接转发到 `nodeapi.deeplink.cloud/api/paypal/getBuyLink`，把 `tier` 映射成对应 HPVideo product_id，`id` 用当前用户的 BSC 钱包地址。

3. **Webhook 接收**：
   ```
   POST /api/billing/creem-webhook
   Body: { request_id, product_id, status, buy_number, ... }
   验证 Creem signature（HMAC-SHA256，secret 在环境变量）
   如果 status == 'success':
     - 查找用户：WHERE wallet_address = request_id
     - 加积分：UPDATE user_credits SET balance = balance + buy_number WHERE user_id = ...
     - 写流水：INSERT INTO credit_transactions (user_id, delta, reason='creem_purchase', metadata)
   返回 200
   ```

4. **流水表（PostgreSQL）**：
   ```sql
   CREATE TABLE user_credits (
     user_id UUID PRIMARY KEY,
     wallet_address VARCHAR(42) UNIQUE NOT NULL,
     balance BIGINT NOT NULL DEFAULT 0,
     bonus_balance BIGINT NOT NULL DEFAULT 0,  -- 加赠 / 邀请奖励 (30 天有效期)
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE credit_transactions (
     id BIGSERIAL PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES user_credits(user_id),
     delta BIGINT NOT NULL,         -- 正数 = 加，负数 = 扣
     reason VARCHAR(40) NOT NULL,   -- 'creem_purchase', 'generation', 'refund', 'bonus', ...
     model VARCHAR(40),             -- 仅 generation 时填
     metadata JSONB,
     creem_event_id VARCHAR(80) UNIQUE,  -- 幂等保证
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX idx_tx_user_created ON credit_transactions(user_id, created_at DESC);
   ```

### 用户视角流程

```
进入 /creator/ → 想生成视频 → 余额不足
   ↓
弹"积分不足"modal，列 4 个推荐档位（默认 $10 / $20 / $50 / $100）
   ↓
点 "$20 套餐" → 前端调 /api/billing/get-checkout-url
   ↓
跳转 Creem 托管支付页（信用卡 / Apple Pay / 韩国本地卡）
   ↓
支付成功 → Creem 跳转回 hpvideo.io/creator/?paid=success
   ↓
后端收到 Webhook → 加积分（通常 5 秒内到账）
   ↓
前端 polling 余额（每 3 秒）→ 检测到余额变化 → toast"+21,000 积分到账"
   ↓
用户继续生成
```

---

## 6. 加密支付通道（钱包用户专属，可选）

钱包用户已经有 BSC 钱包，可以直接用 BNB / USDT / HPC token 充值。这是 DeepLinkGame 没有的差异化：

### 链上支付选项

| 通道 | 加赠 | 实现 |
|---|---:|---|
| **BNB** | +5% | 给定我们的 receiving wallet 地址，用户直接转账，前端 watcher 监听到入账后加积分 |
| **USDT (BSC BEP-20)** | +5% | 同上，1 USDT = 1,000 积分 |
| **HPC token** | +10% | 1 HPC = 1,050 积分（持续推动 HPC 流通）|

### 实现细节

- 后端起一个 watcher 服务，监听 receiving wallet 的 incoming Transfer 事件
- 提取 `from` 字段，根据金额匹配档位
- 调 `add_credits()` 函数加积分
- HPC 通道：用户在 HPC token 合约调 `transfer(receivingWallet, amount)` → watcher 捕获 → 加积分

这条路径不通过 Creem，**省 5% 手续费**，所以可以给 5% 加赠还净赚 1-2 个百分点。

### 钱包到 HPC 兑换

钱包内 HPC 数量 → 1:1 转积分（用户在前端点 "Convert HPC to Credits"），这是 HPC 任务奖励的核心出口。

---

## 7. 防滥用 / 反薅

| 机制 | 实现 |
|---|---|
| 没有免费积分 | 新用户余额 0，不充值用不了，从根上杜绝薅羊毛 |
| 钱包频控 | 同 IP 24h 创建 ≥10 个新钱包 → 暂停充值通道（防机器人）|
| Creem 风控 | Creem 自带 fraud detection，可疑卡自动拒 |
| 退款 | API 失败 → 自动全额退积分；用户主动退订 Creem 订单 → 扣回积分（如余额不足记 negative，禁止生成直到补足）|
| 加赠到期 | bonus_balance 30 天有效期，过期清零（防人攒大额 bonus 后退款）|

---

## 8. 邀请系统（不发免费积分，但发邀请奖励）

不直接给新人免费积分（防薅）；改成"绑定后第一次充值双方都奖励"：

| 角色 | 触发 | 奖励 |
|---|---|---|
| 邀请人 | 被邀请人首次充值（任意金额）| **被邀请人充值额的 10% 加赠积分到邀请人余额** |
| 被邀请人 | 用邀请链接注册并首次充值 | **当次充值 +10% 额外加赠** |

举例：A 邀 B，B 买 $20 包：
- B 拿 21,000 + 2,000 邀请加赠 = 23,000 积分
- A 拿 2,000 加赠积分

成本控制：奖励都来自 bonus_balance（30 天到期），且只在"实付"后发放，CAC 不超过 20% 充值额，可控。

---

## 9. 实施路线图（90 天）

### Sprint 1（第 1 周）：积分骨架 + 一键钱包
- [ ] PostgreSQL 表：`user_credits`, `credit_transactions`
- [ ] 后端 API：`GET /api/credits/balance`, 内部 `charge_for_generation()`, `add_credits()`
- [ ] 前端：右上角积分余额组件 + 一键钱包注册页
- [ ] 改造 wave.py：每次生成前 hold 积分 → 调 API → 成功扣 / 失败退
- [ ] 测试：消耗 / 余额不足拒绝 / 失败退款

### Sprint 2（第 2 周）：Creem 集成
- [ ] 在 Creem 后台注册 10 个 HPVideo 产品（5usd ~ 100usd）
- [ ] 后端：`POST /api/billing/get-checkout-url`, `POST /api/billing/creem-webhook`
- [ ] 前端：积分商店页 `/creator/credits`，弹窗式购买 modal
- [ ] 联调：Creem test mode 跑通 4 种支付方式（卡 / Apple Pay / 韩国本地 / 微信支付）

### Sprint 3（第 3 周）：链上支付通道
- [ ] 后端：BNB / USDT receiving wallet + watcher service
- [ ] 前端：钱包充值页（show address + QR code）
- [ ] HPC ↔ 积分兑换接口

### Sprint 4（第 4 周）：邀请系统
- [ ] 邀请码生成 + 链接 hpvideo.io/r/<code>
- [ ] Cookie 跟踪 + 充值时双向加赠
- [ ] 个人邀请 dashboard

### Sprint 5（第 5-6 周）：防薅 + 监控
- [ ] IP 频控 + 设备指纹（fingerprint.js 已经在用）
- [ ] Creem Webhook 验签 + 幂等
- [ ] Mixpanel 接入（充值漏斗）

### Sprint 6（第 7-8 周）：体验优化
- [ ] Creem 跳转回来后 polling 余额
- [ ] 余额不足时智能推荐档位（基于历史消耗）
- [ ] 充值成功 toast + email 收据（可选邮箱）

### Sprint 7-8（第 9-12 周）：增长 + 内容
- [ ] 公共画廊 / Explore feed
- [ ] Higgsfield 风特效预设 30 个
- [ ] 移动端 PWA

---

## 10. 关键 KPI（90 天目标）

| 指标 | 当前 | 目标 |
|---|---:|---:|
| MAU | ? | 30,000 |
| 充值转化率（注册 → 首充）| 0% | 8% |
| 月充值笔数 | 0 | 5,000 |
| 平均 ARPU（按充值用户）| $0 | $25 |
| 月收入 | $0 | $25,000 |
| 毛利率 | - | 50%+ |
| 复购率（30 天再充率）| - | 40% |

---

## 11. 关键决策 & 待确认

1. **Creem 产品创建**：需要 Creem 账号管理员在后台创建 10 个 HPVideo product（与 DeepLinkGame 分账）→ **谁负责？**
2. **Receiving wallet 地址**：BNB/USDT 收款的钱包地址需要部署 + 配 watcher → **用 HPVideoBNB 多签里的"Liquidity"钱包还是单独建？**
3. **HPC ↔ 积分汇率**：1 HPC = 1,050 积分是初始建议，需要根据 HPC 二级市场价动态调整 → **谁定？**
4. **邮箱备份开不开**：用户可选填邮箱接收加密私钥备份 → 提高留存但增加合规面（GDPR）→ **法务评估**

---

## 附 A：积分扣费 API 伪代码

```python
# backend/apps/web/services/credits.py
import math
from dataclasses import dataclass

@dataclass
class CreditCharge:
    user_id: str
    cost_usd: float
    model: str
    metadata: dict

async def charge_for_generation(charge: CreditCharge) -> int:
    """扣积分，返回剩余余额。失败抛异常（前端展示"积分不足"）"""
    credits_needed = math.ceil(charge.cost_usd * 1000) * 2  # 2x markup, 1000 积分=$1

    async with db.transaction():
        row = await db.fetch_one(
            "SELECT balance, bonus_balance FROM user_credits WHERE user_id = $1 FOR UPDATE",
            charge.user_id,
        )
        total = row["balance"] + row["bonus_balance"]
        if total < credits_needed:
            raise InsufficientCredits(needed=credits_needed, have=total)

        # 优先消耗 bonus（先到期的先扣），不够再扣主余额
        from_bonus = min(credits_needed, row["bonus_balance"])
        from_main = credits_needed - from_bonus
        await db.execute(
            "UPDATE user_credits SET bonus_balance = bonus_balance - $1, "
            "balance = balance - $2, updated_at = NOW() WHERE user_id = $3",
            from_bonus, from_main, charge.user_id,
        )
        await db.execute(
            "INSERT INTO credit_transactions (user_id, delta, reason, model, metadata) "
            "VALUES ($1, $2, 'generation', $3, $4)",
            charge.user_id, -credits_needed, charge.model, json.dumps(charge.metadata),
        )
        return total - credits_needed
```

## 附 B：Creem Webhook 处理

```python
# backend/apps/web/routers/billing.py
import hmac, hashlib

CREEM_WEBHOOK_SECRET = os.getenv("CREEM_WEBHOOK_SECRET")

PRODUCT_TO_CREDITS = {
    "prod_hpvideo_5usd":   {"base": 5_000,   "bonus": 0},
    "prod_hpvideo_10usd":  {"base": 10_000,  "bonus": 0},
    "prod_hpvideo_15usd":  {"base": 15_000,  "bonus": 0},
    "prod_hpvideo_20usd":  {"base": 20_000,  "bonus": 1_000},
    "prod_hpvideo_25usd":  {"base": 25_000,  "bonus": 1_500},
    "prod_hpvideo_30usd":  {"base": 30_000,  "bonus": 2_500},
    "prod_hpvideo_35usd":  {"base": 35_000,  "bonus": 3_500},
    "prod_hpvideo_40usd":  {"base": 40_000,  "bonus": 5_000},
    "prod_hpvideo_50usd":  {"base": 50_000,  "bonus": 7_500},
    "prod_hpvideo_100usd": {"base": 100_000, "bonus": 30_000},
}

@router.post("/api/billing/creem-webhook")
async def creem_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Creem-Signature", "")
    expected = hmac.new(CREEM_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(401, "bad signature")

    payload = json.loads(body)
    if payload["status"] != "success":
        return {"ok": True}  # ignore failed payments

    wallet = payload["request_id"].lower()
    product_id = payload["product_id"]
    event_id = payload["event_id"]

    cfg = PRODUCT_TO_CREDITS.get(product_id)
    if cfg is None:
        log.warning("unknown product_id: %s", product_id)
        return {"ok": True}

    # 幂等：creem_event_id UNIQUE 约束防重复处理
    try:
        async with db.transaction():
            await db.execute(
                "INSERT INTO credit_transactions "
                "(user_id, delta, reason, metadata, creem_event_id) "
                "SELECT user_id, $1, 'creem_purchase', $2, $3 "
                "FROM user_credits WHERE wallet_address = $4",
                cfg["base"], json.dumps(payload), event_id, wallet,
            )
            await db.execute(
                "UPDATE user_credits "
                "SET balance = balance + $1, bonus_balance = bonus_balance + $2 "
                "WHERE wallet_address = $3",
                cfg["base"], cfg["bonus"], wallet,
            )
    except UniqueViolationError:
        log.info("duplicate event %s, skipping", event_id)

    return {"ok": True}
```

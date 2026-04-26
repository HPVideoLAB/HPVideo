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

## 3. 积分包（直接复用 Creem 现有 10 档）

Creem 后台的产品是按 DeepLinkGame 配置的，**HPVideo 不能单独再加优惠**，所以所有档位都是 **flat 1000:1**，无加赠：

| 档位 | 售价 | 积分 | Creem product_id |
|---|---:|---:|---|
| Mini | $5 | 5,000 | prod_4MBe51eU6cvLcuzGHFjLZE |
| Basic | $10 | 10,000 | prod_7D75iFxkbDWUhuCaSegMrP |
| Plus | $15 | 15,000 | prod_4cHi1F6MB9HkHNByOp8PyX |
| Standard | $20 | 20,000 | prod_2Qm2ApNRCwbpVWI0FIEbBl |
| Pro | $25 | 25,000 | prod_6HoR1gM7mP5oDNVPr4aGLX |
| Power | $30 | 30,000 | prod_1ivlJfN9KxYeBcEhleawRY |
| Heavy | $35 | 35,000 | prod_6neOEK2SaWGzP0JQvgPNf4 |
| Studio | $40 | 40,000 | prod_gWRqmD96hKzs41x75sAsE |
| Whale | $50 | 50,000 | prod_5c5SdLP9TXQwVp554TtPaA |
| Legend | $100 | 100,000 | prod_73r40YulOVpHo23N7HmnA0 |

> 这 10 个 product_id 来自 DeepLinkGame `frontend/pricing.html:681` 的 `creemLinks` 表，HPVideo 直接调用 `nodeapi.deeplink.cloud/api/paypal/getBuyLink` 复用同一套，无需新建。

### 毛利测算（无加赠版本）

| 档位 | 收入 | 用户最大消耗（按 credit 零售）| 实际 API 成本（消耗 / 2）| Creem 手续费 5% | 净毛利 |
|---|---:|---:|---:|---:|---:|
| $5 | $5 | $5 | $2.50 | $0.25 | **$2.25 (45%)** |
| $20 | $20 | $20 | $10 | $1.00 | **$9 (45%)** |
| $50 | $50 | $50 | $25 | $2.50 | **$22.50 (45%)** |
| $100 | $100 | $100 | $50 | $5.00 | **$45 (45%)** |

**所有档位毛利率统一 45%**（消耗到底的最坏情况），实际消耗率 60-70% 行业平均下，**真实毛利 55-60%**。

**永不亏钱底线**：每次扣费严格 ≥ 2× API 成本（50% 兜底），扣 Creem 5% 后仍稳定 45%+ 毛利。

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
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE credit_transactions (
     id BIGSERIAL PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES user_credits(user_id),
     delta BIGINT NOT NULL,         -- 正数 = 加，负数 = 扣
     reason VARCHAR(40) NOT NULL,   -- 'creem_purchase', 'crypto_deposit', 'generation', 'refund'
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

## 6. 加密支付通道（可选，与 Creem 同价）

钱包用户已经有 BSC 钱包，也可以直接用 BNB / USDT / HPC token 充值，**与 Creem 一致 flat 1000:1，无加赠**：

### 链上支付选项

| 通道 | 汇率 | 实现 |
|---|---|---|
| **USDT (BSC BEP-20)** | 1 USDT = 1,000 积分 | 用户转 USDT 到 receiving wallet → watcher 加积分 |
| **BNB** | 按链上喂价折算（CoinGecko / Chainlink）| 同上，按转账时 BNB/USD 价折算 |
| **HPC token** | 按官方公布的兑换汇率（与生态价值同步）| 同上 |

### 为什么提供这条路径

- **不是给用户的优惠**（与 Creem 同价），而是给我们的：链上不付 Creem 5% 手续费 → 我们多捕获 5% 毛利
- crypto 用户原生路径，转账更顺手，体验流畅
- HPC token 通道是 HPC 流通的核心出口（HPC 任务奖励 → 用户兑换积分）

### 实现细节

- 后端起 watcher 服务监听 receiving wallet 的 incoming `Transfer` 事件
- 提取 `from` 字段（即用户钱包），根据 token + amount 调 `add_credits()`
- 入账延迟 = BSC 出块时间（≈3 秒）+ 1 confirmation

---

## 7. 防滥用 / 反薅

| 机制 | 实现 |
|---|---|
| 没有免费积分 | 新用户余额 0，不充值用不了，从根上杜绝薅羊毛 |
| 钱包频控 | 同 IP 24h 创建 ≥10 个新钱包 → 暂停充值通道（防机器人）|
| Creem 风控 | Creem 自带 fraud detection，可疑卡自动拒 |
| 退款 | API 失败 → 自动全额退积分；用户主动退订 Creem 订单 → 扣回积分（如余额不足记 negative，禁止生成直到补足）|

---

## 8. 增长机制（Phase 2，启动后再上）

为保持 v1 价格体系简单（无任何额外优惠），以下增长机制延后到产品启动有数据后再启用：

- **邀请系统**：被邀请人首次充值后双方加赠（具体比例数据驱动确定）
- **HPC 任务**：日签 / 邀请 / 完成首单 → 链上发 HPC，HPC 1:1 兑换积分
- **创作者版税**：视频被 remix → 原作者钱包收链上版税

这些都不影响 v1 主流程，纯加项。

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

### Sprint 4（第 4 周）：防薅 + 监控
- [ ] IP 频控 + 设备指纹（fingerprint.js 已经在用）
- [ ] Creem Webhook 验签 + 幂等
- [ ] Mixpanel 接入（充值漏斗）

### Sprint 5（第 5-6 周）：体验优化
- [ ] Creem 跳转回来后 polling 余额
- [ ] 余额不足时智能推荐档位（基于历史消耗）
- [ ] 充值成功 toast + email 收据（可选邮箱）

### Sprint 6-8（第 7-12 周）：增长 + 内容
- [ ] 公共画廊 / Explore feed
- [ ] Higgsfield 风特效预设 30 个
- [ ] 移动端 PWA
- [ ] 邀请 / HPC 任务（数据驱动确定比例后再上）

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

1. **Creem 产品复用**：直接调用 `nodeapi.deeplink.cloud/api/paypal/getBuyLink` 复用 DeepLinkGame 现成的 10 个 product_id → **会计上 Creem 收入会进 DeepLinkGame 商户账户，需要后端按 product_id + 用户钱包来源做内部分账**
2. **Receiving wallet 地址**：USDT/BNB/HPC 收款用 → 建议用 HPVideoBNB 多签里的 "Liquidity" 钱包（`0xA4fAEF0432175813B2EfA3214e8a34C5a3AfFc25`），或新建专用钱包
3. **HPC ↔ 积分汇率**：随 HPC 二级市场价浮动还是固定 → **数据驱动后定**
4. **邮箱备份**：用户可选填邮箱接收加密私钥备份 → 提高留存但增加合规面（GDPR）→ **法务评估**

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
            "SELECT balance FROM user_credits WHERE user_id = $1 FOR UPDATE",
            charge.user_id,
        )
        if row["balance"] < credits_needed:
            raise InsufficientCredits(needed=credits_needed, have=row["balance"])

        await db.execute(
            "UPDATE user_credits SET balance = balance - $1, updated_at = NOW() "
            "WHERE user_id = $2",
            credits_needed, charge.user_id,
        )
        await db.execute(
            "INSERT INTO credit_transactions (user_id, delta, reason, model, metadata) "
            "VALUES ($1, $2, 'generation', $3, $4)",
            charge.user_id, -credits_needed, charge.model, json.dumps(charge.metadata),
        )
        return row["balance"] - credits_needed
```

## 附 B：Creem Webhook 处理

```python
# backend/apps/web/routers/billing.py
import hmac, hashlib

CREEM_WEBHOOK_SECRET = os.getenv("CREEM_WEBHOOK_SECRET")

PRODUCT_TO_CREDITS = {
    # 复用 DeepLinkGame 的 Creem 产品，flat 1000:1，无加赠
    "prod_4MBe51eU6cvLcuzGHFjLZE": 5_000,    # $5
    "prod_7D75iFxkbDWUhuCaSegMrP": 10_000,   # $10
    "prod_4cHi1F6MB9HkHNByOp8PyX": 15_000,   # $15
    "prod_2Qm2ApNRCwbpVWI0FIEbBl": 20_000,   # $20
    "prod_6HoR1gM7mP5oDNVPr4aGLX": 25_000,   # $25
    "prod_1ivlJfN9KxYeBcEhleawRY": 30_000,   # $30
    "prod_6neOEK2SaWGzP0JQvgPNf4": 35_000,   # $35
    "prod_gWRqmD96hKzs41x75sAsE": 40_000,    # $40
    "prod_5c5SdLP9TXQwVp554TtPaA": 50_000,   # $50
    "prod_73r40YulOVpHo23N7HmnA0": 100_000,  # $100
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

    credits = PRODUCT_TO_CREDITS.get(product_id)
    if credits is None:
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
                credits, json.dumps(payload), event_id, wallet,
            )
            await db.execute(
                "UPDATE user_credits SET balance = balance + $1 "
                "WHERE wallet_address = $2",
                credits, wallet,
            )
    except UniqueViolationError:
        log.info("duplicate event %s, skipping", event_id)

    return {"ok": True}
```

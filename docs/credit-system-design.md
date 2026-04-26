# HPVideo 积分体系 + 计费体系设计

**作者**: PM 设计
**日期**: 2026-04-26
**状态**: 草案 - 待 Review

---

## 0. 设计原则（不可妥协）

1. **永不亏钱**：每次 API 消耗 `credits charged >= 2 × API_cost_USD × 1000`（50% 毛利兜底，1000 积分 = $1）。
2. **默认积分模式**：用户不感知"链上交易"，钱包是后台资产，前台只有积分余额。
3. **法币优先**：Google 登录 + Stripe 即可使用，钱包后台一键自动创建（custodial）。
4. **加密保留作差异化**：HPC token 任务、链上版税、DePIN GPU 退款返还到内部钱包，作为增量收入与故事，不作为门槛。

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

**便宜区间**：$0.225 - $0.60（ovi / seedance / hailuo）
**主流区间**：$0.60 - $1.50（wan 720p / vidu / ltx / pixverse / luma）
**高端区间**：$2.10 - $4.80（kling / veo / wan 1080p 长）

---

## 2. 积分换算规则

**1000 积分 = $1 零售价值**（即 1 积分 = $0.001）
行业惯例（Replicate、Pika、Higgsfield、Pixverse 都在 1000:1 量级），数字大用户感觉"积分多"，付费动作的心理门槛也低。

**消耗公式**：`credits_charged = ceil(api_cost_usd × 1000) × 2`
（即 2 倍 API 成本，保证 50% 毛利兜底）

### 模型 × 时长 → 积分消耗对照表

| 模型 / 配置 | API 成本 | 积分消耗 | 用户看到 |
|---|---:|---:|---:|
| **ovi 540p/5s** | $0.225 | **450 积分** | $0.45 |
| **seedance 6s** | $0.30 | **600 积分** | $0.60 |
| **seedance 9s** | $0.45 | **900 积分** | $0.90 |
| **hailuo 6s** | $0.345 | **690 积分** | $0.69 |
| **wan-2.7 480p/5s** | $0.375 | **750 积分** | $0.75 |
| **vidu-q3 4s** | $0.40 | **800 积分** | $0.80 |
| **ltx-2.3 6s** | $0.54 | **1,080 积分** | $1.08 |
| **pixverse 5s** | $0.60 | **1,200 积分** | $1.20 |
| **wan-2.7 720p/5s** | $0.75 | **1,500 积分** | $1.50 |
| **luma-ray-2 5s** | $0.75 | **1,500 积分** | $1.50 |
| **wan-2.7 1080p/5s** | $1.125 | **2,250 积分** | $2.25 |
| **pixverse 8s** | $1.20 | **2,400 积分** | $2.40 |
| **luma-ray-2 10s** | $1.50 | **3,000 积分** | $3.00 |
| **kling-3.0 5s** | $2.10 | **4,200 积分** | $4.20 |
| **wan-2.7 1080p/10s** | $2.25 | **4,500 积分** | $4.50 |
| **veo3.1 4s** | $2.40 | **4,800 积分** | $4.80 |
| **veo3.1 6s** | $3.60 | **7,200 积分** | $7.20 |
| **kling-3.0 10s** | $4.20 | **8,400 积分** | $8.40 |
| **veo3.1 8s** | $4.80 | **9,600 积分** | $9.60 |

**Free 用户可用模型**（成本 ≤ $0.40）: ovi、seedance 6s、hailuo 6s、wan-2.7 480p/5s、vidu-q3 4s。
**带水印** + **480p / 540p 上限**。

---

## 3. 订阅套餐（月付，主收入）

| 套餐 | 价格 | 月度积分 | 性价比 | 关键特权 |
|---|---:|---:|---:|---|
| **Free** | $0 | 300/天（不可累积） | - | 仅低端 5 模型，480p，带水印，1 并发 |
| **Creator** | $9.99/月 | 12,000 积分 | $0.000833/积分 | 无水印，1080p，2 并发，所有模型 |
| **Pro** | $29/月 | 40,000 积分 | $0.000725/积分 | 4 并发，优先队列，30 天积分滚存，商用授权 |
| **Studio** | $99/月 | 150,000 积分 | $0.00066/积分 | 8 并发，4K（wan-2.7 1080p+），API Key，团队 3 席，链上版税收益 |

### 订阅毛利测算（按全消耗算最坏情况）

| 套餐 | 收入 | 用户最大消耗（按 credit 零售价值） | 实际 API 成本（消耗 / 2） | Stripe 费 | 净毛利 |
|---|---:|---:|---:|---:|---:|
| Creator $9.99 | $9.99 | $12（12,000 × $0.001）| **$6** | $0.30 | **$3.69 (37%)** |
| Pro $29 | $29 | $40（40,000 × $0.001）| **$20** | $0.87 | **$8.13 (28%)** |
| Studio $99 | $99 | $150（150,000 × $0.001）| **$75** | $2.97 | **$21.03 (21%)** |

**注意**：上表是用户 100% 用光积分的最坏情况。行业数据显示订阅用户实际消耗率 60-70%，所以**真实毛利 50-60%**。

> 高端套餐毛利率较低是有意为之 —— Studio 的钩子是 API Key + 商用授权 + 团队席位，竞品定价（Runway $95/Pro，Pika $58/Pro）远比我们贵。我们用更高性价比抢 Pro 创作者市场。

### 月度积分滚存规则

- Free：当日清零（防囤积）
- Creator：当月清零
- Pro：30 天滚存，最多累积到 80,000
- Studio：60 天滚存，最多累积到 300,000

---

## 4. 一次性积分包（散户 + 充值）

| 包 | 价格 | 积分 | 加赠 | 等效单价 | 备注 |
|---|---:|---:|---:|---:|---|
| **Starter** | $4.99 | 5,000 | 0 | $0.000998 | 入门试水 |
| **Plus** | $19.99 | 22,000 | +2,000（10%）| $0.000909 | 性价比款 |
| **Power** | $49.99 | 60,000 | +10,000（20%）| $0.000833 | 重度用户 |
| **Whale** | $99.99 | 130,000 | +30,000（30%）| $0.000769 | 工作室 / 团队 |

**最低毛利测试**（$99 包消耗到底）:
- 收入 $99.99
- 130,000 积分 × $0.0005（2× 毛利兜底后实际成本）= **$65 API 成本**
- Stripe ~$3
- **净毛利 ~$32 (32%)** ✓ 不亏

**注意点**：加赠让单价持续下降，但永远 ≥ $0.00077（>2× 消耗时实际成本上限），所以最坏情况仍有 23% 毛利。

### 积分有效期 & 优先消耗顺序

```
消耗优先级（先消耗后到期/最便宜）:
1. Free 每日 30 积分（当日 24:00 UTC 清零）
2. 推广/邀请奖励积分（30 天有效期）
3. 订阅月度积分（按套餐滚存规则）
4. 一次性充值积分（永不过期，但需账户活跃）
```

---

## 5. 防滥用 / 反薅

| 机制 | 实现 |
|---|---|
| Free 上限 | 每日 300 积分（≈ 1 视频），仅 5 个低端模型，480p+ 水印 |
| 邮箱验证 | 必须激活邮箱，禁止 tempmail/10minutemail 域名（黑名单 200+） |
| IP 频控 | 同 IP 24h 内 ≤3 个新账户，再注册需手机号 |
| 设备指纹 | 已经在用 fingerprint.js，结合 IP 哈希拒绝重复设备 |
| Stripe 风控 | 启用 Stripe Radar，3DS 强制，可疑订单人工审核 |
| 退款策略 | API 失败/超时，自动全额退积分；用户主动退订订阅按比例退积分 |

**Free 真实成本上限测算**：
- 假设最差情况：用户每天用满 300 积分 = $0.30 零售价值 = $0.15 实际 API 成本（恰好够 1 个 ovi 5s 或 1 个 wan-2.7 480p/5s）
- 月成本上限：$4.50/活跃 free 用户
- 行业平均 free 用户日活率 ~15%，所以摊薄实际成本 ~$0.65/free 用户/月
- 5% 转化率假设：每 20 个 free 用户养出 1 个 Creator $9.99，用户 LTV = $30 → CAC 上限 $13，实际成本远低于 $13，OK。

---

## 6. 钱包"一键创建"（用户无感）

### 当前问题
现在登录只支持 RainbowKit/wagmi 接钱包，门槛巨高。

### 方案：Custodial Wallet + Privy.io 集成（推荐）

**Privy.io** 是 Pump.fun、Friend.tech、Farcaster 都在用的 SDK：
- 用户用 Google / Apple / Email 登录
- 后台自动派生 Embedded Wallet（私钥分片存 Privy + 用户设备）
- 用户可"导出私钥"升级为完全自管
- 价格：免费 5000 MAU，超出 $0.05/MAU

**集成成本**: 1-2 周（替换现有 wagmi 登录流，但保留 connect 已有钱包的入口）

### 替代方案：自建 Custodial（成本更高）

如果不想付 Privy 费用：
- 服务端用 ethers.js 生成新钱包
- 私钥用 AWS KMS 加密后存 PostgreSQL（独立 schema，权限隔离）
- 提供 `/api/wallet/export` 接口（需 2FA + 邮箱验证）
- 工程量：3-4 周 + 安全审计 + 法律评估（资金保管资质）

**我的建议**：MVP 用 Privy（1 周上线），等 MAU 突破 5K 再评估自建经济性。

### 钱包用途（差异化故事）

| 场景 | 钱包发挥的价值 |
|---|---|
| 用户充值 | 主路径仍是 Stripe / 信用卡 → 积分；BNB/USDT 到链上钱包 = +5% 加赠（吸引 crypto 用户） |
| HPC 任务奖励 | 邀请 / 日签 / 完成首单 → 链上发 HPC，HPC 可以 1 HPC = 1 积分 兑换 |
| 创作者版税 | 视频被 remix → 原作者钱包收 5% 链上版税（对接智能合约 v2 阶段做） |
| DePIN GPU 退款 | DePIN GPU 渲染节省的成本 30% 中分一部分（比如 5%）按月返还到钱包 |
| 链上存证 | 每个生成视频自动 IPFS + BSC 存指纹（可选 toggle，原创证明） |

---

## 7. 法币购买积分流程（核心新增）

### 用户路径
```
未登录 → 点 "Try for Free" → Google 一键登录
       ↓
后台自动创建 Privy Wallet（用户无感）
       ↓
首次进入 /creator/ → 弹"Welcome 礼包：1,000 免费积分（注册赠送，可生成 1-2 个视频）"
       ↓
用完免费 → 弹积分不足 modal → 三档积分包推荐
       ↓
点 Stripe Checkout → 信用卡/Apple Pay/Google Pay/支付宝/微信
       ↓
Webhook 成功 → 后端原子性发放积分
       ↓
回到生成页面，余额已更新
```

### 后端架构

```
┌──────────────┐    HTTPS    ┌──────────────────┐
│ Frontend SDK │────────────▶│ FastAPI /billing │
└──────────────┘             └────────┬─────────┘
                                      │
                            ┌─────────▼──────────┐
                            │ Stripe Checkout    │
                            │ (hosted page)      │
                            └─────────┬──────────┘
                                      │ webhook
                            ┌─────────▼──────────┐
                            │ /webhooks/stripe   │
                            │ verify signature   │
                            └─────────┬──────────┘
                                      │ atomic
                       ┌──────────────▼──────────────┐
                       │ PostgreSQL                  │
                       │ ┌─────────────────────────┐ │
                       │ │ user_credits            │ │
                       │ │  user_id, balance,      │ │
                       │ │  bonus_balance,         │ │
                       │ │  free_balance,          │ │
                       │ │  expires_at             │ │
                       │ ├─────────────────────────┤ │
                       │ │ credit_transactions     │ │
                       │ │  ledger (immutable)     │ │
                       │ ├─────────────────────────┤ │
                       │ │ stripe_events           │ │
                       │ │  idempotency keys       │ │
                       │ └─────────────────────────┘ │
                       └─────────────────────────────┘
```

### 关键技术点

1. **幂等性**：Stripe webhook 用 `event_id` 做主键，重复回调不重复发积分
2. **原子性**：积分发放用 `BEGIN ... INSERT credit_transactions ... UPDATE user_credits ... COMMIT`，PG 事务保证一致
3. **审计**：所有积分变动写入 `credit_transactions` 不可变日志（含 reason、actor、metadata）
4. **退款**：Stripe refund webhook → 自动扣回积分（如果余额不够，记 negative balance，禁止生成直到补足）
5. **货币**：Stripe Tax 自动处理 VAT/GST，价格按用户 IP 显示本地货币（USD 为基准）

### 支付方式覆盖

| 地区 | 主要方式 |
|---|---|
| 北美 / 欧洲 | 信用卡 / Apple Pay / Google Pay / Stripe Link |
| 中国大陆 | 支付宝 / 微信支付（Stripe 直连）|
| 东南亚 | GrabPay / GCash / DANA / FPX |
| 拉美 | OXXO / Boleto / Pix |
| 印度 | UPI / NetBanking |
| 全球 | USDT / BNB / ETH（钱包用户专属，加赠 5%）|

---

## 8. 实施路线图（逆推 90 天）

### Sprint 1（第 1-2 周）：基础积分体系
- [ ] PostgreSQL 表：`user_credits`, `credit_transactions`, `credit_packs`, `subscriptions`
- [ ] 后端 API：`GET /api/credits/balance`, `POST /api/credits/charge`, `POST /api/credits/refund`
- [ ] 前端：右上角积分余额显示组件
- [ ] 单元测试：消耗 / 充值 / 退款 / 不足拒绝 4 个核心场景
- [ ] 改造 wave.py：每次生成前 hold 积分 → 调 API → 成功扣 / 失败退

### Sprint 2（第 3-4 周）：Stripe 集成
- [ ] Stripe 账号 + Tax + Radar 启用
- [ ] 后端：`/api/billing/create-checkout-session`, `/webhooks/stripe`
- [ ] 创建 4 个 Stripe Product（Creator / Pro / Studio 订阅 + 4 个一次性 Price）
- [ ] 前端：积分商店页面 `/creator/credits`
- [ ] 联调：Stripe test mode 跑通 4 种支付方式

### Sprint 3（第 5-6 周）：Privy 钱包 + Google 登录
- [ ] 前端集成 Privy SDK
- [ ] 后端：`/api/auth/privy-callback` 同步用户 + 自动钱包
- [ ] 兼容现有 wagmi 用户（钱包地址迁移）
- [ ] 个人资料页显示钱包地址 + 私钥导出（2FA 守门）

### Sprint 4（第 7-8 周）：Free 限流 + 防薅
- [ ] Email 黑名单（一次性邮箱域名）
- [ ] 设备指纹 + IP 频控
- [ ] Free 模型白名单 + 水印 + 480p 上限
- [ ] 邀请系统：每用户唯一邀请码 + 完成首购双方奖励

### Sprint 5（第 9-10 周）：HPC 任务系统
- [ ] 链上：HPC token 任务合约（日签 / 邀请 / 首购）
- [ ] 后端：HPC ↔ 积分兑换接口
- [ ] 前端：任务中心 + 我的钱包 dashboard

### Sprint 6（第 11-12 周）：监控 + AB
- [ ] Mixpanel / PostHog：转化漏斗追踪
- [ ] 套餐价格 AB 测试（$9.99 vs $14.99 Creator）
- [ ] 积分包加赠率 AB 测试
- [ ] 周报：MRR / Churn / ARPU / CAC

---

## 9. 关键指标 KPI（90 天目标）

| 指标 | 当前 | 目标 |
|---|---:|---:|
| MAU | ? | 50,000 |
| Paid 转化率 | ~0%（钱包门槛）| 5% |
| MRR | ? | $25,000 |
| ARPU | ? | $14 |
| 月留存 | ? | 35% |
| 毛利率 | ? | 50%+ |
| Free → Paid 平均时长 | - | 7 天 |

---

## 10. 关键不确定性 / 待验证

1. **WaveSpeed 批量折扣**：量大后能否谈到 30%+ 折扣？如果能，毛利从 50% 提到 65%。
2. **支付宝/微信 Stripe 通道**：中国用户实际可达性，需要测试。
3. **Privy 私钥托管法律风险**：在某些司法区可能被认定为"虚拟货币托管业务"，需法务确认。
4. **veo3.1 / kling-3.0 高端模型**：单次成本太高，大额订阅用户用满会拉低毛利。可能需要"高端模型加价 10%" 政策（公开透明）。

---

## 附：积分消耗 API 伪代码

```python
# backend/apps/web/services/credits.py
@dataclass
class CreditCharge:
    user_id: str
    cost_usd: float
    model: str
    metadata: dict

async def charge_for_generation(charge: CreditCharge) -> bool:
    credits_needed = math.ceil(charge.cost_usd * 1000) * 2  # 2x markup, 1000 credits = $1
    async with db.transaction():
        balance = await db.fetch_one(
            "SELECT free_balance, bonus_balance, sub_balance, paid_balance "
            "FROM user_credits WHERE user_id = $1 FOR UPDATE",
            charge.user_id,
        )
        total = sum(balance)
        if total < credits_needed:
            raise InsufficientCredits(needed=credits_needed, have=total)

        # consume in priority order: free -> bonus -> sub -> paid
        remaining = credits_needed
        for col in ("free_balance", "bonus_balance", "sub_balance", "paid_balance"):
            avail = balance[col]
            take = min(remaining, avail)
            if take > 0:
                await db.execute(
                    f"UPDATE user_credits SET {col} = {col} - $1 WHERE user_id = $2",
                    take, charge.user_id,
                )
                remaining -= take
            if remaining == 0:
                break

        await db.execute(
            "INSERT INTO credit_transactions (user_id, delta, reason, model, metadata) "
            "VALUES ($1, $2, 'generation', $3, $4)",
            charge.user_id, -credits_needed, charge.model, json.dumps(charge.metadata),
        )
    return True
```

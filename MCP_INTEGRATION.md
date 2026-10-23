# MCP_INTEGRATION.md · 麦当劳 MCP 集成说明

本文说明「麦麦拍一下」实际使用的麦当劳 MCP Server、Tool、调用流程和业务价值。

## 1. MCP Server 概况

| 项目 | 内容 |
| --- | --- |
| Server 名称 | `mcd-mcp`（麦当劳中国官方 MCP Server） |
| 端点 | `https://mcp.mcd.cn` |
| 传输方式 | streamablehttp |
| 鉴权 | HTTP Header：`Authorization: Bearer <MCP_TOKEN>`（Token 由用户在麦当劳 MCP 控制台申请，经环境/连接器配置注入，项目代码中不含任何真实凭证） |
| 官方文档 | https://github.com/M-China/mcd-mcp-server |

## 2. 实际使用的 Tool 清单

### 2.1 公共基础

| Tool | 场景 | 用途 |
| --- | --- | --- |
| `now-time-info` | 所有场景 | 获取服务器当前时间。发现卡时间戳的唯一来源；活动/券有效期判断以此为基准 |
| `query-nearby-stores` | 餐品 | 到店/得来速场景定位门店，取得 `storeCode` 与 `beCode` |
| `delivery-query-addresses` | 餐品（外送） | 查询用户配送地址，取得 `addressId` 与 `beCode` |
| `delivery-query-stores` | 餐品（外送） | 根据地址查询可配送门店 |

### 2.2 场景 A：拍海报，发现玩法

| Tool | 用途 |
| --- | --- |
| `campaign-calendar` | 查询麦当劳官方营销活动日历。海报上有日期时传 `specifiedDate` 锚定（返回锚点日前后各一个有活动的日子），否则查当月，用于核验"图里的活动是否真实存在、什么时间、怎么参加" |
| `mall-points-products`（`catRuleIds: "2>8"`） | 可选：查询周边产品类积分兑换商品，确认联名周边是否可通过积分商城获取 |

### 2.3 场景 B：拍餐品，发现同款

| Tool | 用途 |
| --- | --- |
| `query-meals` | 查询所选门店全量在售餐品，用于图片特征 → 候选餐品的匹配（最多给出 3 个候选及置信度） |
| `query-meal-detail` | 确认候选餐品的组成、是否可特调，帮用户确认"就是它" |
| `calculate-price` | 核实价格（返回单位为分，展示时除以 100 转元）。卡片上的任何价格都来自此工具，不引用图中价格 |
| `create-order` | 可选延伸：用户明确确认价格后创建到店自取/外送订单。本技能绝不跳过用户确认直接下单 |
| `list-nutrition-foods` | 可选：用户问热量/营养时补充官方营养数据 |

### 2.4 场景 C：拍优惠，发现和自己的关系

| Tool | 用途 |
| --- | --- |
| `query-my-coupons` | 查询用户卡包中已拥有的券，回答"我有没有这张券" |
| `available-coupons` | 查询当前可领取的券，回答"现在能不能领到同款" |
| `query-store-coupons` | 查询指定门店+渠道下实际可用的券，回答"到底能不能用"（拥有 ≠ 可用，以此为准） |
| `auto-bind-coupons` | 可选：用户明确说"帮我领券"后一键领取当前可领券 |

## 3. 调用流程

### 场景 A：拍海报，发现玩法

```
用户发图"这个怎么参加？"
   │
   ▼
now-time-info ──► campaign-calendar(specifiedDate=海报日期?) ──► mall-points-products("2>8")?
   │                        │                                          │
   │                 日历是否收录该活动？                        周边是否可积分兑换？
   ▼                        ▼
生成发现卡：活动时间 / 参与条件 / 下一步
（日历未收录 → 明示"官方活动日历暂未收录"，引导以 App 为准）
```

### 场景 B：拍餐品，发现同款

```
用户发图"我也想吃这个"
   │
   ▼
确认用餐方式（默认到店自取并说明）
   │
   ▼
query-nearby-stores  或  delivery-query-addresses → delivery-query-stores
   │
   ▼
query-meals(storeCode, orderType, beType) ──► 图片特征匹配候选（≤3 个）
   │
   ▼
query-meal-detail(code) ──► 用户确认
   │
   ├──► calculate-price ──► 卡片展示核实后的价格
   ├──► list-nutrition-foods（用户问热量时）
   └──► 用户明确确认后：calculate-price → create-order
```

### 场景 C：拍优惠，发现和自己的关系

```
用户发图"我也能用吗？"
   │
   ▼
now-time-info ──► 判断图面有效期（看不清 → 标"待确认"，不默认有效）
   │
   ▼
拆条件：谁能用 / 什么时间 / 什么渠道 / 限什么餐品
   │
   ▼
query-my-coupons + available-coupons (+ query-store-coupons)
   │
   ▼
生成发现卡，固定两层结论：
  ①"图里说有优惠"（对图片的转述）
  ②"你现在实际可以用"（对查询结果的判断）
两者不一致时明确指出差在哪（过期/限门店/需会员…）
```

## 4. 业务价值

1. **接住"感兴趣但没行动"的瞬间**：传统路径要求用户自己翻 App、查规则、对菜单；麦麦拍一下把入口压缩成"发一张图 + 一句话"，AI 负责看懂图片，MCP 负责补上可查询的官方事实。
2. **把图片里的兴趣变成清楚的选择**：每个场景的终点都不是"识别结果"，而是可执行的下一步（买什么、去哪家店、领哪张券）。
3. **"图里说的"与"实际可用的"分离**：优惠场景尤其体现 MCP 的价值——截图会过期、会断章取义，只有对照官方实时数据，卡片才不会变成误导人的旧截图。
4. **可分享、可传播**：发现卡自带查询时间戳与免责提示，天然适合"原来麦当劳这张图还能这样看"的前后对比式演示。
5. **为下单留了自然的延伸路径**：从看懂一张图到确认价格、创建订单，全程复用官方 MCP 下单链路，且每一步都由用户确认驱动。

## 5. 数据与隐私说明

- 项目代码不含任何真实 Token/密钥；MCP Token 通过连接器配置注入（`Bearer YOUR_MCP_TOKEN` 占位符）。
- 位置信息、地址等敏感输入仅在用户明确授权后用于对应工具调用（门店定位、外送查询）。
- 分享用的发现卡不含用户私人信息（不含地址、账号、券码）。

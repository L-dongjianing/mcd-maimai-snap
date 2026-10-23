# 麦麦拍一下 · MCP 工具调用链

麦当劳 MCP Server：`https://mcp.mcd.cn`（streamablehttp，Bearer Token 鉴权，工具前缀 `mcp__mcd-mcp__`）。
以下按三大场景整理调用链。所有工具的实际返回以服务端为准，本文件只描述调用顺序与参数要点。

## 0. 公共前置

| 工具 | 用途 | 要点 |
| --- | --- | --- |
| `now-time-info` | 取服务器当前时间 | 每张发现卡都用它打时间戳；判断活动/券有效期一律以它为准，不用本地时间猜 |
| `query-nearby-stores` | 到店场景定位门店 | 需用户位置授权；返回 storeCode 与 beCode（beType=5 得来速时用） |
| `delivery-query-addresses` → `delivery-query-stores` | 外送场景定位门店 | 先查地址列表拿到 addressId/beCode，再查可配门店 |

## 1. 场景 A：拍海报，发现玩法

```
now-time-info
  └─ campaign-calendar (specifiedDate?: 海报上的日期锚点)
       └─ mall-points-products (catRuleIds: "2>8")   # 可选：联名周边是否可积分兑换
```

- `campaign-calendar` 不传参默认返回当月活动；海报有明确日期（如 "10.24 开启"）时传该日期，返回锚点日前后各一个有活动的日子。
- 日历未收录海报活动时，卡片写"官方活动日历暂未收录"，并引导用户以麦当劳 App 活动页为准。

## 2. 场景 B：拍餐品，发现同款

```
query-nearby-stores 或 delivery-query-addresses → delivery-query-stores   # 定门店
  └─ query-meals (storeCode, orderType, beType[, beCode])                 # 全量在售餐品
       └─ query-meal-detail (storeCode, orderType, beType, code)          # 确认组成/是否可特调
            ├─ calculate-price (items=[{productCode, quantity}])          # 核实价格，单位为分
            └─ list-nutrition-foods                                       # 可选：用户问热量时
```

- orderType/beType/beCode 传参规则：到店自取 beType=1 → orderType=1 且不传 beCode；得来速 beType=5 → orderType=1 + beCode；麦乐送 beType=2 → orderType=2 + beCode。
- `query-meals` 返回后按图片特征做候选匹配（最多 3 个），不要把整个菜单贴给用户。
- 价格展示前必须经 `calculate-price` 核实并除以 100 转元，不得引用图中价格。
- 用户确认购买后：`calculate-price` 展示总价 → 用户明确确认 → `create-order`。任何情况下不跳过用户确认直接下单。

## 3. 场景 C：拍优惠，发现和自己的关系

```
now-time-info                                   # 先判断图上有效期
  ├─ query-my-coupons                           # 用户卡包里已有什么券
  ├─ available-coupons                          # 当前可领的券
  ├─ query-store-coupons (storeCode, orderType) # 指定门店/渠道下实际可用
  └─ auto-bind-coupons                          # 仅用户明确同意后一键领取
```

- `query-my-coupons` 返回用户拥有的券，不做门店/渠道适配；"到底能不能用"必须以 `query-store-coupons` 结果为准。
- 卡片固定输出两层结论："图里说有优惠"（对图片内容的转述）与"你现在实际可以用"（对查询结果的判断）。
- `auto-bind-coupons` 会领取全部可领券，仅在用户明确说"帮我领券"后调用。

## 4. 通用禁令

- 不在无工具支撑的情况下回答"活动什么时候结束 / 券能不能用 / 多少钱"。
- 不把图片上的文字当作已核验事实转述为结论；只能转述并标注"图里说"。
- 查询失败时把失败原因（原文 message）告诉用户，并给出替代路径（如去 App 查），不重试超过 2 次。

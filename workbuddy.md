# workbuddy.md · WorkBuddy 开发对话上下文

> 本文件用于麦当劳程序员节创意开发大赛「WorkBuddy 专项奖励」核验，记录本项目在 WorkBuddy 中的开发过程与关键对话上下文。由开发者自会话中导出整理。

## 开发环境

- **工具**：WorkBuddy 桌面版（macOS），AI 模型由 WorkBuddy 提供
- **开发日期**：2026 年 10 月 23 日
- **关键连接器**：麦当劳官方 MCP（`mcd-mcp`，端点 `https://mcp.mcd.cn`，streamablehttp + Bearer Token）
- **工作区**：WorkBuddy 本地工作区，全程在 WorkBuddy 对话中完成创意细化、代码生成、技能打包与测试

## 开发过程与关键决策

### 1. 创意输入（来自产品经理需求）

开发者以产品经理身份提出了「麦麦拍一下」的完整创作思路，核心洞察：

- 很多消费冲动停在了一张图上——路过门店看到海报、群里收到活动图、刷到别人的餐盘，"感兴趣但还没行动"；
- 产品定位不是"识别图片的工具"，而是"懂麦当劳的看图搭子"；
- 一个入口，三种发现：拍海报发现玩法、拍餐品发现同款、拍优惠发现和自己的关系；
- 产出物是"麦麦发现卡"（我看到了什么 / 和你有什么关系 / 接下来怎么做）；
- 产品性格：懂一点、主动一点，但不替用户做决定；查不清就说清楚，不能为了让卡片好看而编出优惠。

### 2. 比赛规则核验

通过 WorkBuddy 抓取比赛仓库 https://github.com/M-China/mcd-developer-innovation-challenge ，确认提交物要求（README.md / CONTEST_DECLARATION.md 官方原文不可改动 / MCP_INTEGRATION.md / 源代码 / workbuddy.md）、报名条件与 WorkBuddy 专项奖励规则；并抓取官方 CONTEST_DECLARATION.md 原文原样置入项目。

### 3. MCP 能力核验

通过 WorkBuddy 的 MCP 工具检索能力，枚举并确认麦当劳 MCP 实际提供的约 30 个工具（活动日历、门店查询、餐品/详情/算价、卡包券、领券、下单、积分商城、营养数据、时间服务等），梳理出三大场景的工具调用链（详见 MCP_INTEGRATION.md）。

### 4. 技术方案决策

在 WorkBuddy 对话中确定：

- **形态**：WorkBuddy Skill（SKILL.md + references + scripts + assets），AI 负责看图与场景路由，麦当劳 MCP 负责官方事实，二者连接成"发一张图就能开始"的自然使用方式；
- **场景路由**：技能先判断图片属于活动/餐品/优惠，再走对应调用链，用户不需要先想好怎么提问；
- **诚实性红线**：所有结论必须来自 MCP 工具返回；图上文字只能转述（标注"图里说"）；查不到写"暂未查到"；日期看不清标"待确认"；
- **时间戳守卫**：发现卡渲染器（`render_card.js`，零依赖 Node）在缺少 `queryTime` 时拒绝渲染——没有查询时间的卡片会误导转发者；
- **第一版聚焦**：先做透"拍海报，看懂活动"的招牌体验，找同款、验优惠作为自然延伸同样纳入技能流程。

### 5. 开发与测试动作

1. 使用 WorkBuddy 技能创建规范初始化 `maimai-paiyixia` 技能骨架；
2. 编写 SKILL.md（总流程 + 三大场景 + 诚实性红线 + 语气分寸）；
3. 编写 references（MCP 工具调用链图、发现卡模板与三场景示例）；
4. 编写并测试 `scripts/render_card.js`：示例 JSON 渲染通过（`RENDER_OK`），时间戳守卫按预期拒绝无 `queryTime` 输入；
5. 运行 WorkBuddy 官方技能校验/打包脚本，校验通过并产出 `dist/maimai-paiyixia.zip`；
6. 技能已安装至 `~/.workbuddy/skills/maimai-paiyixia/`，可直接在 WorkBuddy 会话中"发一张麦当劳图"实测；
7. **MCP 真实冒烟测试（2026-10-23 14:45）**：在 WorkBuddy 中实调 `mcd-mcp` 官方工具——`now-time-info` 返回服务器时间 2026-10-23 14:45:15（GMT+8），`campaign-calendar` 返回当月真实活动日历（含麦当劳×PEACEMINUSONE 联名徽章/棒球帽、「我就喜欢」限定丝巾、龙焰鸡腿堡系列等）；并用真实活动日历数据走完场景 A 全链路，渲染出真实数据版发现卡 `examples/sample-card-real.html`，验证「MCP 查询 → 发现卡」链路端到端可用。

## 产出物清单（均由 WorkBuddy 对话直接生成）

| 文件 | 说明 |
| --- | --- |
| `skill/maimai-paiyixia/SKILL.md` | 技能主流程 |
| `skill/maimai-paiyixia/references/mcp-tool-map.md` | MCP 调用链 |
| `skill/maimai-paiyixia/references/discovery-card.md` | 发现卡模板 |
| `skill/maimai-paiyixia/scripts/render_card.js` | 发现卡渲染器 |
| `skill/maimai-paiyixia/assets/discovery-card.html` | 卡片样式样例 |
| `examples/usage-examples.md`、`examples/sample-card.html` | 使用示例与渲染样例 |
| `examples/sample-card-real.html` | 真实 MCP 活动日历数据渲染的发现卡（2026-10-23 实测） |
| `README.md`、`MCP_INTEGRATION.md`、`CONTEST_DECLARATION.md`、`workbuddy.md` | 参赛文档 |

## 一句话总结

在 WorkBuddy 中，从一个产品经理的创意叙述出发，核验比赛规则与麦当劳 MCP 真实能力，完成「麦麦拍一下」技能的全部设计、编码、校验与打包——AI 看懂图片，MCP 补上事实，Skill 把二者连成一种更自然的使用方式。

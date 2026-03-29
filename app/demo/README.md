# DeepMatch Complete Workflow Demo

交互式演示页面，展示DeepMatch完整的联合创始人匹配流程。

## 访问方式

启动开发服务器后访问：`http://localhost:3000/demo`

## 功能模块

### 1. Founder Intake (创始人访谈)
- 7轮结构化访谈流程
- 6个信息层收集：Identity, Direction, Capability, Collaboration, Constraints, Credibility
- 进度条和实时对话展示
- 可前后切换查看每轮访谈内容

### 2. Profile Generation (档案生成)
- 双栏对比展示：
  - **Public Profile** (L0可见): headline, thesis, stage, commitment, strengths, looking_for
  - **Detail Profile** (L1匹配后可见): problem_statement, execution_history, decision_style, equity_expectations, risk_tolerance
- 隐私模型说明

### 3. Matching (匹配机制)
- 候选人卡片展示（3个示例）
- 匹配度评分（92%, 85%, 78%）
- 7个匹配信号的进度条可视化：
  - Direction Alignment
  - Capability Fit
  - Stage Compatibility
  - Commitment Match
  - Working Style
  - Risk Tolerance
  - Credibility
- 匹配状态：Mutual Match / Request Sent / Not Contacted
- 匹配推理说明

### 4. Pre-Communication (预沟通)
- 6个主题的结构化对话：
  1. Direction (方向)
  2. Role (角色)
  3. Commitment (承诺)
  4. Working Style (工作方式)
  5. Structure (结构)
  6. Risk (风险)
- 每个主题包含关键问题和Agent总结
- 进度追踪和主题切换

### 5. Fit Memo (适配备忘录)
- **Alignment Summary** (对齐总结): 5个关键对齐点
- **Potential Concerns** (潜在关注点): 2-3个需要注意的问题
- **Recommendation** (推荐):
  - 见面/试点项目/不推荐
  - 具体的下一步建议
- 行动按钮：Schedule Meeting / Start Trial Project

## 技术实现

- **框架**: Next.js 14 (App Router)
- **样式**: TailwindCSS
- **交互**: React Hooks (useState)
- **设计**: 渐变背景 + 毛玻璃效果
- **响应式**: 移动端和桌面端适配

## 使用场景

1. **产品演示**: 向投资人/用户展示完整流程
2. **团队培训**: 帮助团队理解产品逻辑
3. **用户测试**: 收集反馈优化流程
4. **开发参考**: 作为实际功能开发的原型

## 数据说明

当前使用模拟数据展示。实际产品中，这些数据将来自：
- Supabase数据库
- RareID身份认证
- EvoMap Agent协议
- LLM生成的结构化输出

# BabyLog 宝宝记录小程序

一款基于微信云开发的宝宝日常记录工具，支持多宝宝管理、家庭成员共享、扫码加入等功能。

## 主要功能

### 核心记录
- **喂奶记录** - 支持母乳计时（左右侧切换）、配方奶奶量记录
- **睡眠记录** - 计时模式，自动统计睡眠时长
- **尿布记录** - 小便、大便、混合三种类型，可记录颜色和性状
- **体温记录** - 支持额温、耳温、腋温、肛温测量位置
- **用药记录** - 记录药品名称、剂量、单位、备注

### 协作功能
- **多宝宝管理** - 一个账号可管理多个宝宝
- **家庭共享** - 通过小程序码邀请家人加入
- **扫码加入** - 扫描其他用户分享的小程序码加入宝宝

### 数据功能
- **历史统计** - 按周查看记录，自动汇总每日数据
- **数据导出** - 一键导出完整数据为 JSON 格式
- **云端存储** - 所有数据存储在云开发数据库

### 个性化
- **夜间模式** - 切换深色主题
- **喂奶提醒** - 自定义提醒间隔

## 技术栈

- **前端**: 微信小程序原生开发
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）
- **部署**: CloudBase CLI

## 目录结构

```
babylog-miniprogram/
├── miniprogram/              # 小程序前端代码
│   ├── app.js               # 应用入口
│   ├── app.json             # 应用配置
│   ├── app.wxss             # 全局样式
│   ├── sitemap.json         # SEO 配置
│   ├── assets/
│   │   └── icons/           # 图标资源
│   └── pages/
│       ├── index/           # 记录主页
│       ├── history/         # 历史记录
│       ├── baby/            # 宝宝管理
│       └── settings/        # 设置
├── cloudfunctions/          # 云函数
│   └── getQRCode/           # 生成小程序码
├── scripts/                 # 工具脚本
│   └── init-database.js     # 数据库初始化
├── .trae/                   # Trae IDE 配置
│   └── mcp.json             # MCP 配置
├── cloudbaserc.json         # CloudBase 配置
├── project.config.json      # 小程序项目配置
└── DATABASE.md              # 数据库结构说明
```

## 快速开始

### 前置条件
- Node.js >= v18.15.0
- 微信开发者工具
- 云开发环境

### 配置步骤

1. **修改环境配置**
   - `miniprogram/app.js` 第 13 行：设置 `env` 为你的云开发环境 ID
   - `project.config.json` 第 40 行：设置 `appid` 为你的小程序 AppID
   - `cloudbaserc.json` 第 2 行：设置 `envId`

2. **创建数据库集合**
   在云开发控制台创建：
   - `babies` - 宝宝档案
   - `records` - 日常记录
   - `users` - 用户信息（可选）

3. **设置集合权限**
   - babies: 仅创建者可读写，所有人可读
   - records: 仅创建者可读写，所有人可读
   - users: 仅创建者可读写

4. **部署云函数**
   ```bash
   cd cloudfunctions/getQRCode
   npm install
   ```

   或使用 CLI:
   ```bash
   tcb fn deploy getQRCode --env-id <your-env-id> --dir cloudfunctions/getQRCode
   ```

5. **在微信开发者工具中打开**
   - 导入项目目录
   - 点击"编译"测试

## 数据库结构

### babies 集合
```javascript
{
  _id: "auto",
  name: "宝宝姓名",
  birthDate: "2026-05-28",
  ownerId: "user_xxx",
  members: ["user_xxx"],
  createdAt: "2026-06-09T..."
}
```

### records 集合
```javascript
{
  _id: "auto",
  babyId: "baby_xxx",
  userId: "user_xxx",
  type: "feed | sleep | diaper | temperature | medicine",
  ts: "2026-06-09T14:20:00",
  dateKey: "2026-06-09",
  // 类型特定字段
}
```

详细结构见 [DATABASE.md](DATABASE.md)

## 部署命令

```bash
# 登录
tcb login

# 部署云函数
tcb fn deploy getQRCode --env-id <env-id> --dir cloudfunctions/getQRCode

# 一键部署
tcb deploy
```

## 开发命令

```bash
# 安装依赖
npm install

# 在微信开发者工具中预览
# 导入项目，点击"编译"
```

## 常见问题

### Q: getQRCode 云函数调用失败？
A: `wxacode.getUnlimited` 需要在小程序端通过 access_token 调用，云端测试会因为缺少 access_token 失败。在小程序中调用即可正常使用。

### Q: 数据库读写失败？
A: 检查集合权限设置，确保不是"仅创建者"模式。

### Q: 扫码加入没反应？
A: 确保 `app.js` 的 `onLaunch` 中处理了 `options.scene` 参数。

## 许可证

MIT

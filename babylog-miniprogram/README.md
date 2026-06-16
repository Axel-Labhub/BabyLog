# BabyLog - 宝宝成长记录小程序

<div align="center">

![BabyLog Logo](https://img.shields.io/badge/BabyLog-宝宝记录-FF9500?style=for-the-badge)
![WeChat](https://img.shields.io/badge/微信小程序-✓-07C160?style=for-the-badge)
![CloudBase](https://img.shields.io/badge/云开发-腾讯云-007AFF?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

**一款简洁美观的宝宝日常记录工具，支持喂奶、睡眠、尿布、体温、用药等多种记录类型**

[功能介绍](#功能介绍) · [快速开始](#快速开始) · [部署指南](#部署指南) · [项目结构](#项目结构) · [更新日志](https://github.com/Axel-Labhub/BabyLog/releases)

</div>

---

## ✨ 功能介绍

### 📝 核心记录功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 🍼 母乳记录 | 计时器模式，支持左右侧切换 | ✅ 已完成 |
| 🥛 配方奶记录 | 记录奶量（ml） | ✅ 已完成 |
| 😴 睡眠记录 | 计时器模式，自动统计时长 | ✅ 已完成 |
| 👶 尿布记录 | 小便/大便/混合，可记录颜色和性状 | ✅ 已完成 |
| 🌡️ 体温记录 | 支持额温/耳温/腋温/肛温 | ✅ 已完成 |
| 💊 用药记录 | 记录药品名称、剂量、备注 | ✅ 已完成 |

### 👨‍👩‍👧 协作功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 多宝宝管理 | 一个账号管理多个宝宝 | ✅ 已完成 |
| 家庭共享 | 通过小程序码邀请家人加入 | ✅ 已完成 |
| 扫码加入 | 扫描分享码快速加入宝宝 | ✅ 已完成 |

### 📊 数据功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 历史统计 | 按周查看，自动汇总每日数据 | ✅ 已完成 |
| 数据导出 | 一键导出 JSON 格式数据 | ✅ 已完成 |
| 云端存储 | 数据存储在云开发数据库 | ✅ 已完成 |

### ⚙️ 个性化设置

| 功能 | 说明 | 状态 |
|------|------|------|
| 夜间模式 | 深色主题切换 | 🔄 开发中 |
| 喂奶提醒 | 自定义提醒间隔 | 🔄 开发中 |

---

## 🚀 快速开始

### 前置条件

- Node.js >= v18.15.0
- 微信开发者工具
- 腾讯云账号（开通云开发）
- 小程序 AppID

### 配置步骤

#### 1. 克隆项目

```bash
git clone https://github.com/Axel-Labhub/BabyLog.git
cd BabyLog
```

#### 2. 配置云开发环境

登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)，创建云开发环境后：

- 获取 **环境 ID**（格式：`env-xxxxxxxx`）
- 获取 **云开发环境名称**

#### 3. 修改配置文件

编辑以下文件，填入你的配置：

**miniprogram/app.js** (第 13 行)
```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为你的环境 ID
  traceUser: true
})
```

**project.config.json** (第 40 行)
```json
"appid": "your-app-id" // 替换为你的小程序 AppID
```

**cloudbaserc.json** (第 2 行)
```json
"envId": "your-env-id" // 替换为你的环境 ID
```

#### 4. 创建数据库集合

在云开发控制台 → 数据库，创建以下集合：

| 集合名称 | 用途 |
|---------|------|
| `babies` | 宝宝档案 |
| `records` | 日常记录 |
| `users` | 用户信息（可选） |

#### 5. 设置集合权限

| 集合 | 权限设置 |
|------|---------|
| babies | 仅创建者可读写，所有人可读 |
| records | 仅创建者可读写，所有人可读 |
| users | 仅创建者可读写 |

#### 6. 打开项目

1. 打开微信开发者工具
2. 导入项目，目录选择 `babylog-miniprogram`
3. 点击 **编译** 测试

---

## 📁 项目结构

```
BabyLog/
├── miniprogram/              # 小程序前端代码
│   ├── app.js               # 应用入口，全局状态管理
│   ├── app.json             # 应用配置，页面路由，tabBar
│   ├── app.wxss             # 全局样式
│   ├── sitemap.json          # SEO 配置
│   ├── assets/
│   │   └── icons/           # tabBar 图标资源
│   └── pages/
│       ├── index/           # 📝 记录主页
│       │   ├── index.js     # 喂奶、睡眠、尿布、体温、用药逻辑
│       │   ├── index.wxml   # 页面结构
│       │   └── index.wxss   # 页面样式
│       ├── history/         # 📅 历史记录
│       │   ├── history.js   # 按周统计、每日汇总
│       │   ├── history.wxml # 页面结构
│       │   └── history.wxss # 页面样式
│       ├── baby/             # 👶 宝宝管理
│       │   ├── baby.js      # 创建、编辑、删除宝宝，生成小程序码
│       │   ├── baby.wxml    # 宝宝信息、成员管理
│       │   └── baby.wxss    # 页面样式
│       └── settings/         # ⚙️ 设置
│           ├── settings.js   # 数据导出、清除缓存、主题设置
│           ├── settings.wxml # 设置项列表
│           └── settings.wxss # 页面样式
├── cloudfunctions/           # 云函数
│   └── getQRCode/           # 生成带场景值的小程序码
│       ├── index.js         # 云函数入口
│       └── package.json     # 依赖配置
├── scripts/                  # 工具脚本
│   └── init-database.js     # 数据库初始化脚本
├── .trae/                   # Trae IDE 配置
│   └── mcp.json             # CloudBase MCP 配置
├── cloudbaserc.json         # CloudBase Framework 配置
├── project.config.json      # 微信小程序项目配置
├── DATABASE.md              # 📖 数据库结构详细文档
└── README.md                # 项目说明文档
```

---

## 🗄️ 数据库结构

### babies 集合 - 宝宝档案

```javascript
{
  _id: "自动生成",
  name: "宝宝姓名",
  birthDate: "2026-05-28",
  ownerId: "创建者用户 ID",
  members: ["user_xxx", "user_yyy"],  // 家庭成员
  createdAt: "2026-06-09T14:20:00"
}
```

### records 集合 - 日常记录

```javascript
// 喂奶记录
{
  type: "feed",
  feedType: "breast | formula",  // 母乳/配方奶
  side: "left | right",          // 母乳侧
  duration: 720,                 // 母乳时长（秒）
  amount: null,                  // 配方奶奶量（ml）
  ...
}

// 睡眠记录
{
  type: "sleep",
  duration: 8400,  // 睡眠时长（秒）
  ...
}

// 尿布记录
{
  type: "diaper",
  diaperType: "pee | poop | both",
  poopColor: "黄色 | 绿色 | 棕色 | 黑色",
  poopConsistency: "水样 | 稀软 | 软 | 偏硬",
  ...
}

// 体温记录
{
  type: "temperature",
  value: 36.5,
  position: "forehead | ear | armpit | anus",
  ...
}

// 用药记录
{
  type: "medicine",
  name: "退烧药",
  dosage: "5",
  unit: "ml | mg | g | 袋",
  note: "饭后服用",
  ...
}
```

详细文档：[DATABASE.md](DATABASE.md)

---

## 🌐 部署指南

### 云函数部署

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
cd babylog-miniprogram
tcb fn deploy getQRCode --env-id <your-env-id> --dir cloudfunctions/getQRCode
```

### 一键部署

```bash
# 使用 CloudBase Framework
tcb deploy
```

---

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **微信小程序** | 原生开发框架 |
| **云开发** | 腾讯云云开发服务 |
| **云函数** | Node.js 18 云函数 |
| **云数据库** | MongoDB 文档数据库 |
| **云存储** | 文件存储服务 |
| **CloudBase CLI** | 命令行部署工具 |

---

## 📱 界面预览

> 截图待添加

### 记录页面
### 历史页面
### 宝宝管理
### 设置页面

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 开源协议

本项目采用 MIT 开源协议，详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [微信小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/) - 小程序开发框架
- [腾讯云开发](https://cloud.tencent.com/product/tcb) - 云开发服务
- [CloudBase Framework](https://github.com/TencentCloud/cloudbase-framework) - 部署框架

---

<div align="center">

**如果这个项目对你有帮助，请点个 ⭐ Star 支持一下！**

Made with ❤️ by [Axel-Labhub](https://github.com/Axel-Labhub)

</div>

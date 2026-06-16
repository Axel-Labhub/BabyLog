# BabyLog 微信小程序 - 云数据库集合说明

## 数据库集合结构

### 1. babies 集合

存储宝宝档案信息。

```javascript
{
  _id: "auto-generated",       // 自动生成的文档 ID
  name: "沐沐",                 // 宝宝姓名
  birthDate: "2026-05-28",     // 出生日期 (YYYY-MM-DD)
  ownerId: "user_xxx",         // 创建者用户 ID
  members: ["user_xxx"],       // 成员用户 ID 数组
  createdAt: "2026-06-09T..."  // 创建时间
}
```

**权限设置：**
- 创建者可读写
- 成员可读

### 2. records 集合

存储日常记录。

```javascript
{
  _id: "auto-generated",       // 自动生成的文档 ID
  babyId: "baby_xxx",          // 关联的宝宝 ID
  userId: "user_xxx",          // 记录创建者 ID
  type: "feed",                // 记录类型: feed | sleep | diaper
  ts: "2026-06-09T14:20:00",   // 记录时间 (本地时间字符串)
  dateKey: "2026-06-09",       // 日期键 (YYYY-MM-DD)，用于查询

  // 喂奶记录特有字段
  feedType: "breast",          // 喂养类型: breast | formula
  side: "left",                // 母乳侧: left | right (配方奶为 null)
  duration: 720,               // 母乳时长 (秒) (配方奶为 null)
  amount: null,                // 配方奶量 (ml) (母乳为 null)

  // 睡眠记录特有字段
  duration: 8400,              // 睡眠时长 (秒)

  // 尿布记录特有字段
  diaperType: "poop",          // 尿布类型: pee | poop | both
  poopColor: "黄色",           // 大便颜色 (纯尿为 null)
  poopConsistency: "软"        // 大便性状 (纯尿为 null)
}
```

**权限设置：**
- 成员可读写

### 3. users 集合（可选）

存储用户昵称等信息。

```javascript
{
  _id: "user_xxx",             // 用户 ID
  nickname: "妈妈",            // 昵称
  createdAt: "2026-06-09T..."  // 创建时间
}
```

**权限设置：**
- 用户可读写自己的记录

---

## 初始化步骤

1. 在微信云开发控制台创建以下集合：
   - `babies`
   - `records`
   - `users`（可选）

2. 设置集合权限：
   - `babies`: 仅创建者可读写，所有人可读
   - `records`: 仅创建者可读写，所有人可读
   - `users`: 仅创建者可读写

3. 部署云函数：
   - 上传并部署 `getQRCode` 云函数

4. 配置小程序：
   - 在 `project.config.json` 中填写你的 AppID
   - 在 `app.js` 中填写你的云开发环境 ID

---

## 扫码加入流程

1. 用户 A 创建宝宝档案
2. 用户 A 点击"分享小程序码"
3. 云函数 `getQRCode` 生成带 `scene=babyId` 的小程序码
4. 用户 B 扫码进入小程序
5. 小程序解析 scene 参数获取 babyId
6. 将用户 B 加入该宝宝的 members 数组

**注意：** 需在 `app.js` 的 `onLaunch` 中处理 scene 参数：

```javascript
onLaunch(options) {
  // 处理扫码进入
  if (options.scene) {
    const babyId = decodeURIComponent(options.scene)
    this.joinBaby(babyId)
  }
}

// 加入宝宝
async joinBaby(babyId) {
  const db = wx.cloud.database()
  await db.collection('babies').doc(babyId).update({
    data: {
      members: db.command.push(this.globalData.userId)
    }
  })
  this.globalData.babyId = babyId
  wx.setStorageSync('currentBabyId', babyId)
}
```
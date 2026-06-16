// app.js
App({
  globalData: {
    babyId: null,
    babyInfo: null,
    userId: null
  },

  onLaunch: function (options) {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-cloud-env-id', // 替换为你的云开发环境 ID
        traceUser: true
      })
    }

    // 获取或创建用户 ID
    this.initUserId()

    // 处理扫码进入
    if (options.scene) {
      const babyId = decodeURIComponent(options.scene)
      this.joinBaby(babyId)
    } else {
      // 恢复上次选择的宝宝
      this.restoreLastBaby()
    }
  },

  // 加入宝宝（扫码进入）
  async joinBaby(babyId) {
    const db = wx.cloud.database()

    try {
      // 检查是否已加入
      const res = await db.collection('babies').doc(babyId).get()
      const baby = res.data

      if (baby.members && baby.members.includes(this.globalData.userId)) {
        // 已加入，直接设置
        this.globalData.babyId = babyId
        this.globalData.babyInfo = baby
        wx.setStorageSync('currentBabyId', babyId)
      } else {
        // 未加入，添加到成员列表
        await db.collection('babies').doc(babyId).update({
          data: {
            members: db.command.push(this.globalData.userId)
          }
        })

        this.globalData.babyId = babyId
        this.globalData.babyInfo = baby
        wx.setStorageSync('currentBabyId', babyId)

        wx.showToast({
          title: `已加入 ${baby.name}`,
          icon: 'success'
        })
      }
    } catch (err) {
      console.error('加入宝宝失败', err)
    }
  },

  // 初始化用户 ID（匿名用户标识）
  initUserId() {
    let userId = wx.getStorageSync('userId')
    if (!userId) {
      userId = this.generateId()
      wx.setStorageSync('userId', userId)
    }
    this.globalData.userId = userId
  },

  // 恢复上次选择的宝宝
  restoreLastBaby() {
    const babyId = wx.getStorageSync('currentBabyId')
    if (babyId) {
      this.globalData.babyId = babyId
      this.loadBabyInfo(babyId)
    }
  },

  // 加载宝宝信息
  loadBabyInfo(babyId) {
    const db = wx.cloud.database()
    db.collection('babies').doc(babyId).get({
      success: res => {
        this.globalData.babyInfo = res.data
      }
    })
  },

  // 生成唯一 ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(16).slice(2, 6)
  },

  // 格式化时长（秒 -> XX分XX秒）
  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m === 0) return `${s}秒`
    if (s === 0) return `${m}分钟`
    return `${m}分${s}秒`
  },

  // 格式化时长（睡眠用：X小时X分钟）
  formatDurationHour(seconds) {
    if (!seconds || seconds < 0) return '0分钟'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h === 0) return `${m}分钟`
    if (m === 0) return `${h}小时`
    return `${h}小时${m}分钟`
  },

  // 格式化时间（ISO -> HH:MM）
  formatTime(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  },

  // 格式化日期（YYYY-MM-DD -> 今天/昨天/X月X日）
  formatDate(dateKey) {
    const today = this.getDateKey(new Date())
    const yesterday = this.getDateKey(new Date(Date.now() - 86400000))

    if (dateKey === today) return '今天'
    if (dateKey === yesterday) return '昨天'

    const d = new Date(dateKey)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`
  },

  // 获取日期键（YYYY-MM-DD）
  getDateKey(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  // 获取 ISO 时间字符串（本地时间）
  getLocalISOString(date) {
    const d = date || new Date()
    const y = d.getFullYear()
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    const s = d.getSeconds().toString().padStart(2, '0')
    return `${y}-${m}-${day}T${h}:${min}:${s}`
  }
})
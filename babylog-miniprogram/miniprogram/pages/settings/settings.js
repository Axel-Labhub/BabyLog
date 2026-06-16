// pages/settings/settings.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userId: '',
    darkMode: false,
    feedReminder: false,
    reminderInterval: 3
  },

  onLoad() {
    this.setData({
      userId: app.globalData.userId
    })
    this.loadSettings()
  },

  // 加载设置
  loadSettings() {
    const darkMode = wx.getStorageSync('darkMode') || false
    const feedReminder = wx.getStorageSync('feedReminder') || false
    const reminderInterval = wx.getStorageSync('reminderInterval') || 3

    this.setData({
      darkMode,
      feedReminder,
      reminderInterval
    })
  },

  // 导出数据
  async exportData() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }

    wx.showLoading({ title: '导出中...' })

    try {
      // 获取宝宝信息
      const babyRes = await db.collection('babies').doc(app.globalData.babyId).get()
      const baby = babyRes.data

      // 获取所有记录
      const recordsRes = await db.collection('records')
        .where({
          babyId: app.globalData.babyId
        })
        .orderBy('ts', 'asc')
        .get()

      // 格式化导出数据
      const exportData = {
        version: '1.0',
        exportTime: app.getLocalISOString(),
        baby: {
          id: baby._id,
          name: baby.name,
          birthDate: baby.birthDate
        },
        records: recordsRes.data.map(r => {
          const record = {
            id: r._id,
            type: r.type,
            ts: r.ts
          }

          if (r.type === 'feed') {
            record.feedType = r.feedType
            record.side = r.feedType === 'breast' ? r.side : null
            record.duration = r.feedType === 'breast' ? r.duration : null
            record.amount = r.feedType === 'formula' ? r.amount : null
          } else if (r.type === 'sleep') {
            record.duration = r.duration
          } else if (r.type === 'diaper') {
            record.diaperType = r.diaperType
            record.poopColor = r.diaperType !== 'pee' ? r.poopColor : null
            record.poopConsistency = r.diaperType !== 'pee' ? r.poopConsistency : null
          } else if (r.type === 'temperature') {
            record.value = r.value
            record.position = r.position
          } else if (r.type === 'medicine') {
            record.name = r.name
            record.dosage = r.dosage
            record.unit = r.unit
            record.note = r.note
          }

          return record
        })
      }

      wx.hideLoading()

      // 显示导出数据
      const jsonStr = JSON.stringify(exportData, null, 2)

      wx.showModal({
        title: '导出数据',
        content: '数据已准备好，是否复制到剪贴板？',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: jsonStr,
              success: () => {
                wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
              }
            })
          }
        }
      })
    } catch (err) {
      wx.hideLoading()
      console.error('导出失败', err)
      wx.showToast({ title: '导出失败', icon: 'error' })
    }
  },

  // 清除缓存
  clearData() {
    wx.showModal({
      title: '确认清除',
      content: '将清除本地存储的设置信息，不会删除云端数据',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.setStorageSync('userId', app.globalData.userId) // 保留用户 ID
          wx.showToast({ title: '已清除', icon: 'success' })
          this.loadSettings()
        }
      }
    })
  },

  // 夜间模式
  toggleDarkMode(e) {
    const darkMode = e.detail.value
    this.setData({ darkMode })
    wx.setStorageSync('darkMode', darkMode)

    // 提示需要重启生效
    if (darkMode) {
      wx.showToast({ title: '夜间模式已开启', icon: 'success' })
    }
  },

  // 喂奶提醒
  toggleFeedReminder(e) {
    const feedReminder = e.detail.value
    this.setData({ feedReminder })
    wx.setStorageSync('feedReminder', feedReminder)

    if (feedReminder) {
      // 开启提醒
      this.startFeedReminder()
      wx.showToast({ title: '提醒已开启', icon: 'success' })
    } else {
      // 关闭提醒
      this.stopFeedReminder()
    }
  },

  // 设置提醒间隔
  setReminderInterval(e) {
    const interval = e.currentTarget.dataset.interval
    this.setData({ reminderInterval: interval })
    wx.setStorageSync('reminderInterval', interval)

    // 重启提醒
    if (this.data.feedReminder) {
      this.startFeedReminder()
    }
  },

  // 开启喂奶提醒
  startFeedReminder() {
    // 小程序后台运行时无法持续提醒，这里仅做简单实现
    // 实际需要配合云函数定时推送
  },

  // 关闭喂奶提醒
  stopFeedReminder() {
    // 清除提醒
  },

  // 反馈建议
  showFeedback() {
    wx.showModal({
      title: '反馈建议',
      content: '如有问题或建议，请联系开发者',
      showCancel: false
    })
  }
})
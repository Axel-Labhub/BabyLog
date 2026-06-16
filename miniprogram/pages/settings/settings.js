const app = getApp()
const DB = require('../../utils/db')
const Formatter = require('../../utils/formatter')

Page({
  data: {
    userId: '',
    darkMode: false,
    feedReminder: false,
    reminderInterval: 3,
    soundEnabled: true,
    vibrationEnabled: true,
    autoSync: true,
    showAbout: false,
    appVersion: '1.0.0',
    totalRecords: 0,
    babyCount: 0
  },

  onLoad() {
    this.setData({
      userId: app.globalData.userId
    })
    this.loadSettings()
    this.loadStats()
  },

  loadSettings() {
    const darkMode = wx.getStorageSync('darkMode') || false
    const feedReminder = wx.getStorageSync('feedReminder') || false
    const reminderInterval = wx.getStorageSync('reminderInterval') || 3
    const soundEnabled = wx.getStorageSync('soundEnabled') !== false
    const vibrationEnabled = wx.getStorageSync('vibrationEnabled') !== false
    const autoSync = wx.getStorageSync('autoSync') !== false

    this.setData({
      darkMode,
      feedReminder,
      reminderInterval,
      soundEnabled,
      vibrationEnabled,
      autoSync
    })
  },

  async loadStats() {
    try {
      const babyRes = await DB.query('babies', {
        members: app.globalData.userId
      })

      const babyCount = babyRes.success ? babyRes.data.length : 0

      let totalRecords = 0
      if (babyRes.success && babyRes.data.length > 0) {
        const babyIds = babyRes.data.map(b => b._id)
        const recordsRes = await DB.query('records', {
          babyId: wx.cloud.database().command.in(babyIds)
        })
        totalRecords = recordsRes.success ? recordsRes.data.length : 0
      }

      this.setData({ babyCount, totalRecords })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  async exportData() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }

    wx.showLoading({ title: '导出中...' })

    try {
      const babyRes = await DB.get('babies', app.globalData.babyId)
      if (!babyRes.success) {
        wx.hideLoading()
        wx.showToast({ title: '获取宝宝信息失败', icon: 'error' })
        return
      }

      const baby = babyRes.data

      const recordsRes = await DB.query('records', {
        babyId: app.globalData.babyId
      }, {
        orderBy: { field: 'ts', direction: 'asc' }
      })

      const exportData = {
        version: '1.0',
        exportTime: Formatter.getLocalISOString(),
        baby: {
          id: baby._id,
          name: baby.name,
          birthDate: baby.birthDate,
          createdAt: baby.createdAt
        },
        records: recordsRes.success ? recordsRes.data.map(r => this.formatExportRecord(r)) : []
      }

      wx.hideLoading()

      const jsonStr = JSON.stringify(exportData, null, 2)

      wx.showModal({
        title: '导出数据',
        content: `共 ${exportData.records.length} 条记录，是否复制到剪贴板？`,
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

  formatExportRecord(r) {
    const record = {
      id: r._id,
      type: r.type,
      ts: r.ts,
      dateKey: r.dateKey
    }

    switch (r.type) {
      case 'feed':
        record.feedType = r.feedType
        record.side = r.side
        record.duration = r.duration
        record.amount = r.amount
        break
      case 'sleep':
        record.duration = r.duration
        break
      case 'diaper':
        record.diaperType = r.diaperType
        record.poopColor = r.poopColor
        record.poopConsistency = r.poopConsistency
        break
      case 'temperature':
        record.value = r.value
        record.position = r.position
        break
      case 'medicine':
        record.name = r.name
        record.dosage = r.dosage
        record.unit = r.unit
        record.note = r.note
        break
    }

    return record
  },

  clearData() {
    wx.showModal({
      title: '确认清除',
      content: '将清除本地存储的设置信息，不会删除云端数据',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.setStorageSync('userId', app.globalData.userId)
          wx.showToast({ title: '已清除', icon: 'success' })
          this.loadSettings()
          this.loadStats()
        }
      }
    })
  },

  toggleDarkMode(e) {
    const darkMode = e.detail.value
    this.setData({ darkMode })
    wx.setStorageSync('darkMode', darkMode)

    if (darkMode) {
      wx.showToast({ title: '夜间模式已开启', icon: 'success' })
    } else {
      wx.showToast({ title: '夜间模式已关闭', icon: 'success' })
    }
  },

  toggleFeedReminder(e) {
    const feedReminder = e.detail.value
    this.setData({ feedReminder })
    wx.setStorageSync('feedReminder', feedReminder)

    if (feedReminder) {
      app.startFeedReminderCheck()
      wx.showToast({ title: `已设置 ${this.data.reminderInterval} 小时提醒`, icon: 'success' })
    } else {
      app.stopFeedReminderCheck()
      wx.showToast({ title: '喂奶提醒已关闭', icon: 'success' })
    }
  },

  setReminderInterval(e) {
    const interval = e.currentTarget.dataset.interval
    this.setData({ reminderInterval: interval })
    wx.setStorageSync('reminderInterval', interval)

    if (this.data.feedReminder) {
      app.startFeedReminderCheck()
    }
  },

  toggleSound(e) {
    const soundEnabled = e.detail.value
    this.setData({ soundEnabled })
    wx.setStorageSync('soundEnabled', soundEnabled)
  },

  toggleVibration(e) {
    const vibrationEnabled = e.detail.value
    this.setData({ vibrationEnabled })
    wx.setStorageSync('vibrationEnabled', vibrationEnabled)
  },

  toggleAutoSync(e) {
    const autoSync = e.detail.value
    this.setData({ autoSync })
    wx.setStorageSync('autoSync', autoSync)
  },

  showAbout() {
    this.setData({ showAbout: true })
  },

  hideAbout() {
    this.setData({ showAbout: false })
  },

  showFeedback() {
    wx.showModal({
      title: '反馈建议',
      content: '感谢您的使用！如有问题或建议，请通过微信搜索"萌宝记"联系我们。',
      showCancel: false
    })
  },

  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  checkUpdate() {
    wx.showLoading({ title: '检查更新...' })

    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate((res) => {
      wx.hideLoading()
      if (res.hasUpdate) {
        updateManager.onUpdateReady(() => {
          wx.showModal({
            title: '更新提示',
            content: '发现新版本，是否立即更新？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                updateManager.applyUpdate()
              }
            }
          })
        })
        updateManager.onUpdateFailed(() => {
          wx.showToast({ title: '更新失败', icon: 'error' })
        })
      } else {
        wx.showToast({ title: '已是最新版本', icon: 'success' })
      }
    })
  }
})

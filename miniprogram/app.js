const DB = require('./utils/db')
const Formatter = require('./utils/formatter')

App({
  globalData: {
    babyId: null,
    babyInfo: null,
    userId: null,
    reminderTimer: null
  },

  onLaunch: async function (options) {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'babylog-d0gj4uu2hdc688ae3',
        traceUser: true
      })
    }

    this.initUserId()

    if (options && options.scene) {
      try {
        const babyId = decodeURIComponent(options.scene)
        if (babyId) {
          await this.joinBaby(babyId)
        }
      } catch (err) {
        console.error('解析扫码参数失败', err)
      }
    } else {
      this.restoreLastBaby()
    }

    this.startFeedReminderCheck()
  },

  onShow: function () {
    this.startFeedReminderCheck()
  },

  onHide: function () {
    this.stopFeedReminderCheck()
  },

  startFeedReminderCheck() {
    this.stopFeedReminderCheck()
    this.globalData.reminderTimer = setInterval(() => {
      this.checkFeedReminder()
    }, 60000)
    this.checkFeedReminder()
  },

  stopFeedReminderCheck() {
    if (this.globalData.reminderTimer) {
      clearInterval(this.globalData.reminderTimer)
      this.globalData.reminderTimer = null
    }
  },

  async checkFeedReminder() {
    const feedReminder = wx.getStorageSync('feedReminder')
    if (!feedReminder || !this.globalData.babyId) return

    const reminderInterval = wx.getStorageSync('reminderInterval') || 3
    const intervalMs = reminderInterval * 60 * 60 * 1000

    try {
      const res = await DB.query('records', {
        babyId: this.globalData.babyId,
        type: 'feed'
      }, {
        orderBy: { field: 'ts', direction: 'desc' },
        limit: 1
      })

      if (!res.success || res.data.length === 0) return

      const lastFeed = res.data[0]
      const lastFeedTime = new Date(lastFeed.ts).getTime()
      const now = Date.now()

      if (now - lastFeedTime >= intervalMs) {
        const lastRemind = wx.getStorageSync('lastFeedRemindTime')
        if (!lastRemind || now - lastRemind >= intervalMs) {
          wx.showModal({
            title: '喂奶提醒',
            content: `宝宝已经${reminderInterval}小时没有吃奶了，该喂奶啦！`,
            showCancel: false,
            confirmText: '知道了'
          })
          wx.setStorageSync('lastFeedRemindTime', now)
        }
      }
    } catch (err) {
      console.error('检查喂奶提醒失败', err)
    }
  },

  async joinBaby(babyId) {
    if (!babyId) return

    try {
      const res = await DB.get('babies', babyId)
      if (!res.success || !res.data) {
        wx.showToast({ title: '宝宝信息不存在', icon: 'none' })
        return
      }

      const baby = res.data

      if (baby.members && baby.members.includes(this.globalData.userId)) {
        this.setCurrentBaby(baby)
        wx.showToast({ title: `已切换到 ${baby.name}`, icon: 'success' })
      } else {
        await DB.push('babies', babyId, 'members', this.globalData.userId)
        const newRes = await DB.get('babies', babyId)
        if (newRes.success) {
          this.setCurrentBaby(newRes.data)
          wx.showToast({ title: `已加入 ${baby.name}`, icon: 'success' })
        }
      }
    } catch (err) {
      console.error('加入宝宝失败', err)
      wx.showToast({ title: '加入失败', icon: 'error' })
    }
  },

  initUserId() {
    let userId = wx.getStorageSync('userId')
    if (!userId) {
      userId = Formatter.generateId()
      wx.setStorageSync('userId', userId)
    }
    this.globalData.userId = userId
  },

  restoreLastBaby() {
    const babyId = wx.getStorageSync('currentBabyId')
    if (babyId) {
      this.globalData.babyId = babyId
      this.loadBabyInfo(babyId)
    }
  },

  loadBabyInfo(babyId) {
    DB.get('babies', babyId).then(res => {
      if (res.success) {
        this.globalData.babyInfo = res.data
      }
    })
  },

  setCurrentBaby(baby) {
    this.globalData.babyId = baby._id
    this.globalData.babyInfo = baby
    wx.setStorageSync('currentBabyId', baby._id)
  },

  formatDuration(seconds) {
    return Formatter.formatDuration(seconds)
  },

  formatDurationHour(seconds) {
    return Formatter.formatDurationHour(seconds)
  },

  formatTime(isoString) {
    return Formatter.formatTime(isoString)
  },

  formatDate(dateKey) {
    return Formatter.formatDate(dateKey)
  },

  getDateKey(date) {
    return Formatter.getDateKey(date)
  },

  getLocalISOString(date) {
    return Formatter.getLocalISOString(date)
  },

  formatBabyAge(birthDate) {
    return Formatter.formatBabyAge(birthDate)
  },

  onError: function (err) {
    console.error('全局错误:', err)
  },

  async safeCall(fn, errorMsg = '操作失败') {
    try {
      return await fn()
    } catch (err) {
      console.error(errorMsg, err)
      wx.showToast({ title: errorMsg, icon: 'none' })
      return null
    }
  }
})

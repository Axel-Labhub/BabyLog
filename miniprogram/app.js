const DB = require('./utils/db')
const Formatter = require('./utils/formatter')

App({
  globalData: {
    babyId: null,
    babyInfo: null,
    userId: null
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

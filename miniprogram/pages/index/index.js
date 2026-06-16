const app = getApp()
const DB = require('../../utils/db')
const Formatter = require('../../utils/formatter')

Page({
  data: {
    babyInfo: null,
    babyAge: '',
    currentDate: '',
    formattedDate: '',
    records: [],
    stats: {
      feedCount: 0,
      feedDuration: '0分',
      sleepDuration: '0分',
      diaperCount: 0,
      tempCount: 0,
      medCount: 0,
      totalCount: 0
    },
    lastFeed: null,
    loading: false,
    feedRunning: false,
    feedStart: 0,
    feedSide: 'left',
    feedTimerDisplay: '00:00',
    feedTimer: null,
    feedDuration: 0,
    sleepRunning: false,
    sleepStart: 0,
    sleepTimerDisplay: '00:00',
    sleepTimer: null,
    showFormulaModal: false,
    formulaAmount: '',
    showDiaperModal: false,
    diaperType: 'pee',
    poopColor: '黄色',
    poopConsistency: '软',
    showQuickFeedModal: false,
    showTempModal: false,
    tempValue: '',
    tempPosition: 'forehead',
    showMedModal: false,
    medName: '',
    medDosage: '',
    medUnit: 'ml',
    medNote: '',
    showToast: false,
    toastMessage: '',
    undoRid: null,
    undoTimer: null
  },

  onLoad() {
    this.initDate()
  },

  onShow() {
    this.checkBaby()
    this.loadRecords()
    this.restoreTimerState()
  },

  onUnload() {
    this.clearTimers()
  },

  onHide() {
    this.saveTimerState()
  },

  initDate() {
    const today = Formatter.getDateKey(new Date())
    this.setData({
      currentDate: today,
      formattedDate: Formatter.formatDate(today)
    })
  },

  checkBaby() {
    const babyInfo = app.globalData.babyInfo
    if (babyInfo) {
      this.setData({
        babyInfo,
        babyAge: Formatter.formatBabyAge(babyInfo.birthDate)
      })
    } else {
      this.setData({
        babyInfo: null,
        babyAge: ''
      })
    }
  },

  async loadRecords() {
    if (!app.globalData.babyId) {
      this.setData({
        records: [],
        stats: {
          feedCount: 0,
          feedDuration: '0分',
          sleepDuration: '0分',
          diaperCount: 0,
          tempCount: 0,
          medCount: 0,
          totalCount: 0
        },
        lastFeed: null,
        loading: false
      })
      return
    }

    this.setData({ loading: true })

    try {
      const res = await DB.query('records', {
        babyId: app.globalData.babyId,
        dateKey: this.data.currentDate
      }, {
        orderBy: { field: 'ts', direction: 'desc' }
      })

      if (res.success) {
        const records = res.data.map(r => Formatter.formatRecord(r))
        const stats = Formatter.calculateDailyStats(res.data)
        const lastFeed = await this.getLastFeed()

        this.setData({ records, stats, lastFeed })
      }
    } catch (err) {
      console.error('加载记录失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  async getLastFeed() {
    if (!app.globalData.babyId) return null

    try {
      const res = await DB.query('records', {
        babyId: app.globalData.babyId,
        type: 'feed'
      }, {
        orderBy: { field: 'ts', direction: 'desc' },
        limit: 1
      })

      if (!res.success || res.data.length === 0) return null

      const last = res.data[0]
      let detail = ''
      if (last.feedType === 'breast') {
        detail = `${last.side === 'left' ? '左' : '右'}侧 ${Formatter.formatDuration(last.duration)}`
      } else {
        detail = `${last.amount}ml`
      }

      return {
        timeAgo: Formatter.getTimeAgo(last.ts),
        detail
      }
    } catch (err) {
      console.error('获取上次喂奶失败', err)
      return null
    }
  },

  prevDay() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() - 1)
    const newDate = Formatter.getDateKey(current)
    this.setData({
      currentDate: newDate,
      formattedDate: Formatter.formatDate(newDate)
    })
    this.loadRecords()
  },

  nextDay() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() + 1)
    const newDate = Formatter.getDateKey(current)
    const today = Formatter.getDateKey(new Date())
    if (newDate > today) return
    this.setData({
      currentDate: newDate,
      formattedDate: Formatter.formatDate(newDate)
    })
    this.loadRecords()
  },

  showDatePicker() {
    const today = Formatter.getDateKey(new Date())
    wx.showDatePicker({
      date: this.data.currentDate,
      start: '2020-01-01',
      end: today,
      success: (res) => {
        const selected = `${res.year}-${String(res.month).padStart(2, '0')}-${String(res.day).padStart(2, '0')}`
        this.setData({
          currentDate: selected,
          formattedDate: Formatter.formatDate(selected)
        })
        this.loadRecords()
      }
    })
  },

  handleFeed() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    if (this.data.sleepRunning) {
      wx.showToast({ title: '请先结束睡眠', icon: 'none' })
      return
    }
    if (this.data.feedRunning) {
      this.stopFeed()
    } else {
      this.startFeed()
    }
  },

  startFeed() {
    this.setData({
      feedRunning: true,
      feedStart: Date.now(),
      feedSide: 'left',
      feedTimerDisplay: '00:00'
    })
    this.startFeedTimer()
  },

  stopFeed() {
    clearInterval(this.data.feedTimer)
    const duration = Math.floor((Date.now() - this.data.feedStart) / 1000)
    this.setData({
      feedDuration: duration,
      feedRunning: false
    })

    if (duration < 30) {
      this.setData({ showQuickFeedModal: true })
    } else {
      this.saveFeedRecord('breast', this.data.feedSide, duration, null)
    }
  },

  switchFeedSide() {
    this.setData({
      feedSide: this.data.feedSide === 'left' ? 'right' : 'left'
    })
  },

  startFeedTimer() {
    this.data.feedTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.data.feedStart) / 1000)
      const min = Math.floor(elapsed / 60)
      const sec = elapsed % 60
      this.setData({
        feedTimerDisplay: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      })
    }, 1000)
  },

  quickFeedBreast() {
    this.setData({ showQuickFeedModal: false })
    this.saveFeedRecord('breast', this.data.feedSide, this.data.feedDuration, null)
  },

  quickFeedFormula() {
    this.setData({
      showQuickFeedModal: false,
      showFormulaModal: true,
      formulaAmount: ''
    })
  },

  hideQuickFeedModal() {
    this.setData({ showQuickFeedModal: false })
  },

  hideFormulaModal() {
    this.setData({ showFormulaModal: false })
  },

  onFormulaInput(e) {
    this.setData({ formulaAmount: e.detail.value })
  },

  confirmFormula() {
    const amount = parseInt(this.data.formulaAmount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效奶量', icon: 'none' })
      return
    }
    this.setData({ showFormulaModal: false })
    this.saveFeedRecord('formula', null, null, amount)
  },

  async saveFeedRecord(feedType, side, duration, amount) {
    if (!app.globalData.babyId) return

    const record = {
      babyId: app.globalData.babyId,
      userId: app.globalData.userId,
      type: 'feed',
      feedType,
      side: feedType === 'breast' ? side : null,
      duration: feedType === 'breast' ? duration : null,
      amount: feedType === 'formula' ? amount : null,
      ts: Formatter.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    const res = await DB.add('records', record)
    if (res.success) {
      this.showToast(`已记录 🍼 ${feedType === 'breast' ? '母乳' : '配方奶'}`, res.data._id)
      this.loadRecords()
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  handleSleep() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    if (this.data.feedRunning) {
      wx.showToast({ title: '请先结束喂奶', icon: 'none' })
      return
    }
    if (this.data.sleepRunning) {
      this.stopSleep()
    } else {
      this.startSleep()
    }
  },

  startSleep() {
    this.setData({
      sleepRunning: true,
      sleepStart: Date.now(),
      sleepTimerDisplay: '00:00'
    })
    this.startSleepTimer()
  },

  stopSleep() {
    clearInterval(this.data.sleepTimer)
    const duration = Math.floor((Date.now() - this.data.sleepStart) / 1000)
    this.setData({ sleepRunning: false })

    if (duration < 60) {
      wx.showToast({ title: '睡眠时间太短', icon: 'none' })
      return
    }

    this.saveSleepRecord(duration)
  },

  startSleepTimer() {
    this.data.sleepTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.data.sleepStart) / 1000)
      const hour = Math.floor(elapsed / 3600)
      const min = Math.floor((elapsed % 3600) / 60)
      const sec = elapsed % 60
      if (hour > 0) {
        this.setData({
          sleepTimerDisplay: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        })
      } else {
        this.setData({
          sleepTimerDisplay: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        })
      }
    }, 1000)
  },

  async saveSleepRecord(duration) {
    if (!app.globalData.babyId) return

    const record = {
      babyId: app.globalData.babyId,
      userId: app.globalData.userId,
      type: 'sleep',
      duration,
      ts: Formatter.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    const res = await DB.add('records', record)
    if (res.success) {
      this.showToast(`已记录 😴 睡眠 ${Formatter.formatDurationHour(duration)}`, res.data._id)
      this.loadRecords()
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  handleDiaper() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }

    this.setData({
      showDiaperModal: true,
      diaperType: 'pee',
      poopColor: '黄色',
      poopConsistency: '软'
    })
  },

  hideDiaperModal() {
    this.setData({ showDiaperModal: false })
  },

  selectDiaperType(e) {
    this.setData({ diaperType: e.currentTarget.dataset.type })
  },

  selectPoopColor(e) {
    this.setData({ poopColor: e.currentTarget.dataset.color })
  },

  selectPoopConsistency(e) {
    this.setData({ poopConsistency: e.currentTarget.dataset.consistency })
  },

  async confirmDiaper() {
    const { diaperType, poopColor, poopConsistency } = this.data
    if (!app.globalData.babyId) return

    const record = {
      babyId: app.globalData.babyId,
      userId: app.globalData.userId,
      type: 'diaper',
      diaperType,
      poopColor: diaperType !== 'pee' ? poopColor : null,
      poopConsistency: diaperType !== 'pee' ? poopConsistency : null,
      ts: Formatter.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    const res = await DB.add('records', record)
    if (res.success) {
      const typeName = diaperType === 'pee' ? '小便' : (diaperType === 'poop' ? '大便' : '混合')
      this.showToast(`已记录 👶 ${typeName}`, res.data._id)
      this.setData({ showDiaperModal: false })
      this.loadRecords()
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  handleMore() {
    wx.showActionSheet({
      itemList: ['体温记录', '用药记录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.showTempModal()
        } else if (res.tapIndex === 1) {
          this.showMedModal()
        }
      }
    })
  },

  showTempModal() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    this.setData({
      showTempModal: true,
      tempValue: '',
      tempPosition: 'forehead'
    })
  },

  hideTempModal() {
    this.setData({ showTempModal: false })
  },

  onTempInput(e) {
    this.setData({ tempValue: e.detail.value })
  },

  selectTempPosition(e) {
    this.setData({ tempPosition: e.currentTarget.dataset.pos })
  },

  async confirmTemp() {
    const value = parseFloat(this.data.tempValue)
    if (isNaN(value) || value < 30 || value > 45) {
      wx.showToast({ title: '请输入有效体温(30-45°C)', icon: 'none' })
      return
    }
    if (!app.globalData.babyId) return

    const record = {
      babyId: app.globalData.babyId,
      userId: app.globalData.userId,
      type: 'temperature',
      value: value,
      position: this.data.tempPosition,
      ts: Formatter.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    const res = await DB.add('records', record)
    if (res.success) {
      this.setData({ showTempModal: false })
      this.showToast(`已记录 🌡️ ${value}°C`, res.data._id)
      this.loadRecords()
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  showMedModal() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    this.setData({
      showMedModal: true,
      medName: '',
      medDosage: '',
      medUnit: 'ml',
      medNote: ''
    })
  },

  hideMedModal() {
    this.setData({ showMedModal: false })
  },

  onMedNameInput(e) {
    this.setData({ medName: e.detail.value })
  },

  onMedDosageInput(e) {
    this.setData({ medDosage: e.detail.value })
  },

  onMedNoteInput(e) {
    this.setData({ medNote: e.detail.value })
  },

  selectMedUnit(e) {
    this.setData({ medUnit: e.currentTarget.dataset.unit })
  },

  async confirmMed() {
    const { medName, medDosage, medUnit, medNote } = this.data
    if (!medName.trim()) {
      wx.showToast({ title: '请输入药品名称', icon: 'none' })
      return
    }
    if (!medDosage.trim()) {
      wx.showToast({ title: '请输入剂量', icon: 'none' })
      return
    }
    if (!app.globalData.babyId) return

    const record = {
      babyId: app.globalData.babyId,
      userId: app.globalData.userId,
      type: 'medicine',
      name: medName.trim(),
      dosage: medDosage.trim(),
      unit: medUnit,
      note: medNote.trim(),
      ts: Formatter.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    const res = await DB.add('records', record)
    if (res.success) {
      this.setData({ showMedModal: false })
      this.showToast(`已记录 💊 ${medName.trim()}`, res.data._id)
      this.loadRecords()
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？'
    })

    if (!res.confirm) return

    const result = await DB.remove('records', id)
    if (result.success) {
      wx.showToast({ title: '已删除', icon: 'success' })
      this.loadRecords()
    } else {
      wx.showToast({ title: '删除失败', icon: 'error' })
    }
  },

  showToast(message, recordId) {
    this.setData({
      showToast: true,
      toastMessage: message,
      undoRid: recordId
    })

    if (this.data.undoTimer) {
      clearTimeout(this.data.undoTimer)
    }

    this.data.undoTimer = setTimeout(() => {
      this.hideToast()
    }, 3500)
  },

  hideToast() {
    this.setData({
      showToast: false,
      toastMessage: '',
      undoRid: null
    })
  },

  async undoRecord() {
    if (!this.data.undoRid) return

    const result = await DB.remove('records', this.data.undoRid)
    if (result.success) {
      this.hideToast()
      wx.showToast({ title: '已撤销', icon: 'success' })
      this.loadRecords()
    }
  },

  goToBaby() {
    wx.switchTab({ url: '/pages/baby/baby' })
  },

  goToHistory() {
    wx.switchTab({ url: '/pages/history/history' })
  },

  clearTimers() {
    if (this.data.feedTimer) {
      clearInterval(this.data.feedTimer)
    }
    if (this.data.sleepTimer) {
      clearInterval(this.data.sleepTimer)
    }
    if (this.data.undoTimer) {
      clearTimeout(this.data.undoTimer)
    }
  },

  saveTimerState() {
    if (this.data.feedRunning) {
      wx.setStorageSync('feedTimerState', {
        start: this.data.feedStart,
        side: this.data.feedSide
      })
    }
    if (this.data.sleepRunning) {
      wx.setStorageSync('sleepTimerState', {
        start: this.data.sleepStart
      })
    }
  },

  restoreTimerState() {
    const feedState = wx.getStorageSync('feedTimerState')
    if (feedState) {
      const elapsed = Math.floor((Date.now() - feedState.start) / 1000)
      if (elapsed < 7200) {
        this.setData({
          feedRunning: true,
          feedStart: feedState.start,
          feedSide: feedState.side
        })
        this.startFeedTimer()
      }
      wx.removeStorageSync('feedTimerState')
    }

    const sleepState = wx.getStorageSync('sleepTimerState')
    if (sleepState) {
      const elapsed = Math.floor((Date.now() - sleepState.start) / 1000)
      if (elapsed < 43200) {
        this.setData({
          sleepRunning: true,
          sleepStart: sleepState.start
        })
        this.startSleepTimer()
      }
      wx.removeStorageSync('sleepTimerState')
    }
  }
})

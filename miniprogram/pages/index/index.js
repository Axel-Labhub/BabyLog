// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    // 宝宝信息
    babyInfo: null,
    babyAge: 0,

    // 当前日期
    currentDate: '',
    formattedDate: '',

    // 记录数据
    records: [],
    stats: {
      feedCount: 0,
      feedDuration: '0分',
      sleepDuration: '0分',
      diaperCount: 0
    },
    lastFeed: null,

    // 喂奶计时器
    feedRunning: false,
    feedStart: 0,
    feedSide: 'left',
    feedTimerDisplay: '00:00',
    feedTimer: null,
    feedDuration: 0, // 用于短时喂奶

    // 睡眠计时器
    sleepRunning: false,
    sleepStart: 0,
    sleepTimerDisplay: '00:00',
    sleepTimer: null,

    // 弹窗状态
    showFormulaModal: false,
    formulaAmount: '',
    showDiaperModal: false,
    diaperType: 'pee',
    poopColor: '黄色',
    poopConsistency: '软',
    showQuickFeedModal: false,

    // 体温弹窗
    showTempModal: false,
    tempValue: '',
    tempPosition: 'forehead',

    // 用药弹窗
    showMedModal: false,
    medName: '',
    medDosage: '',
    medUnit: 'ml',
    medNote: '',

    // Toast
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
  },

  onUnload() {
    this.clearTimers()
  },

  onHide() {
    // 页面隐藏时保存计时状态
    this.saveTimerState()
  },

  // 初始化日期
  initDate() {
    const today = app.getDateKey(new Date())
    this.setData({
      currentDate: today,
      formattedDate: app.formatDate(today)
    })
  },

  // 检查宝宝
  checkBaby() {
    const babyInfo = app.globalData.babyInfo
    if (babyInfo) {
      const babyAge = this.calculateBabyAge(babyInfo.birthDate)
      this.setData({
        babyInfo,
        babyAge
      })
    } else {
      this.setData({
        babyInfo: null,
        babyAge: 0
      })
    }
  },

  // 计算宝宝天数
  calculateBabyAge(birthDate) {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    birth.setHours(0, 0, 0, 0)
    const diff = today - birth
    return Math.floor(diff / 86400000) + 1
  },

  // 加载记录
  async loadRecords() {
    if (!app.globalData.babyId) {
      this.setData({
        records: [],
        stats: {
          feedCount: 0,
          feedDuration: '0分',
          sleepDuration: '0分',
          diaperCount: 0
        },
        lastFeed: null
      })
      return
    }

    try {
      const res = await db.collection('records')
        .where({
          babyId: app.globalData.babyId,
          dateKey: this.data.currentDate
        })
        .orderBy('ts', 'desc')
        .get()

      const records = this.formatRecords(res.data)
      const stats = this.calculateStats(res.data)
      const lastFeed = this.getLastFeed()

      this.setData({
        records,
        stats,
        lastFeed
      })
    } catch (err) {
      console.error('加载记录失败', err)
    }
  },

  // 格式化记录
  formatRecords(rawRecords) {
    return rawRecords.map(r => {
      const item = {
        id: r._id,
        type: r.type,
        time: app.formatTime(r.ts),
        icon: '',
        title: '',
        detail: ''
      }

      if (r.type === 'feed') {
        item.icon = '🍼'
        if (r.feedType === 'breast') {
          item.title = `母乳 ${r.side === 'left' ? '左' : '右'}侧`
          item.detail = app.formatDuration(r.duration)
        } else {
          item.title = '配方奶'
          item.detail = `${r.amount}ml`
        }
      } else if (r.type === 'sleep') {
        item.icon = '😴'
        item.title = '睡眠'
        item.detail = app.formatDurationHour(r.duration)
      } else if (r.type === 'diaper') {
        item.icon = r.diaperType === 'pee' ? '💧' : (r.diaperType === 'poop' ? '💩' : '💩💧')
        item.title = r.diaperType === 'pee' ? '小便' : (r.diaperType === 'poop' ? '大便' : '混合')
        if (r.diaperType !== 'pee') {
          item.detail = `${r.poopColor || ''} ${r.poopConsistency || ''}`.trim()
        }
      } else if (r.type === 'temperature') {
        item.icon = '🌡️'
        item.title = '体温'
        const posMap = { forehead: '额温', ear: '耳温', armpit: '腋温', anus: '肛温' }
        item.detail = `${r.value}°C ${posMap[r.position] || ''}`.trim()
      } else if (r.type === 'medicine') {
        item.icon = '💊'
        item.title = `用药 ${r.name || ''}`.trim()
        item.detail = `${r.dosage || ''}${r.unit || ''} ${r.note || ''}`.trim()
      }

      return item
    })
  },

  // 计算统计
  calculateStats(rawRecords) {
    let feedCount = 0
    let feedDuration = 0
    let sleepDuration = 0
    let diaperCount = 0

    rawRecords.forEach(r => {
      if (r.type === 'feed') {
        feedCount++
        if (r.duration) feedDuration += r.duration
      } else if (r.type === 'sleep') {
        sleepDuration += r.duration || 0
      } else if (r.type === 'diaper') {
        diaperCount++
      }
    })

    return {
      feedCount,
      feedDuration: app.formatDuration(feedDuration),
      sleepDuration: app.formatDurationHour(sleepDuration),
      diaperCount
    }
  },

  // 获取上次喂奶
  async getLastFeed() {
    if (!app.globalData.babyId) return null

    try {
      const res = await db.collection('records')
        .where({
          babyId: app.globalData.babyId,
          type: 'feed'
        })
        .orderBy('ts', 'desc')
        .limit(1)
        .get()

      if (res.data.length === 0) return null

      const last = res.data[0]
      const now = new Date()
      const lastTime = new Date(last.ts)
      const diffMs = now - lastTime
      const diffMin = Math.floor(diffMs / 60000)

      let timeAgo = ''
      if (diffMin < 1) {
        timeAgo = '刚刚'
      } else if (diffMin < 60) {
        timeAgo = `${diffMin}分钟前`
      } else {
        const diffHour = Math.floor(diffMin / 60)
        timeAgo = `${diffHour}小时前`
      }

      let detail = ''
      if (last.feedType === 'breast') {
        detail = `${last.side === 'left' ? '左' : '右'}侧 ${app.formatDuration(last.duration)}`
      } else {
        detail = `${last.amount}ml`
      }

      return {
        timeAgo,
        detail
      }
    } catch (err) {
      console.error('获取上次喂奶失败', err)
      return null
    }
  },

  // 日期导航
  prevDay() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() - 1)
    const newDate = app.getDateKey(current)
    this.setData({
      currentDate: newDate,
      formattedDate: app.formatDate(newDate)
    })
    this.loadRecords()
  },

  nextDay() {
    const current = new Date(this.data.currentDate)
    current.setDate(current.getDate() + 1)
    const newDate = app.getDateKey(current)
    const today = app.getDateKey(new Date())
    if (newDate > today) return
    this.setData({
      currentDate: newDate,
      formattedDate: app.formatDate(newDate)
    })
    this.loadRecords()
  },

  showDatePicker() {
    const today = app.getDateKey(new Date())
    wx.showDatePicker({
      date: this.data.currentDate,
      start: '2020-01-01',
      end: today,
      success: (res) => {
        const selected = `${res.year}-${String(res.month).padStart(2, '0')}-${String(res.day).padStart(2, '0')}`
        this.setData({
          currentDate: selected,
          formattedDate: app.formatDate(selected)
        })
        this.loadRecords()
      }
    })
  },

  // 喂奶操作
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

    this.data.feedTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.data.feedStart) / 1000)
      const min = Math.floor(elapsed / 60)
      const sec = elapsed % 60
      this.setData({
        feedTimerDisplay: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      })
    }, 1000)
  },

  stopFeed() {
    clearInterval(this.data.feedTimer)

    const duration = Math.floor((Date.now() - this.data.feedStart) / 1000)
    this.setData({
      feedDuration: duration,
      feedRunning: false
    })

    // 短于30秒，弹出选择
    if (duration < 30) {
      this.setData({
        showQuickFeedModal: true
      })
    } else {
      // 直接保存母乳记录
      this.saveFeedRecord('breast', this.data.feedSide, duration, null)
    }
  },

  switchFeedSide() {
    this.setData({
      feedSide: this.data.feedSide === 'left' ? 'right' : 'left'
    })
  },

  // 快速选择
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

  // 配方奶弹窗
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

  // 保存喂奶记录
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
      ts: app.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    try {
      const res = await db.collection('records').add({ data: record })
      this.showToast(`已记录 🍼 ${feedType === 'breast' ? '母乳' : '配方奶'}`, res._id)
      this.loadRecords()
    } catch (err) {
      console.error('保存记录失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 睡眠操作
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

  async stopSleep() {
    clearInterval(this.data.sleepTimer)

    const duration = Math.floor((Date.now() - this.data.sleepStart) / 1000)
    this.setData({ sleepRunning: false })

    if (duration < 60) {
      wx.showToast({ title: '睡眠时间太短', icon: 'none' })
      return
    }

    // 保存睡眠记录
    if (!app.globalData.babyId) return

    const record = {
      babyId: app.globalData.babyId,
      userId: app.globalData.userId,
      type: 'sleep',
      duration,
      ts: app.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    try {
      const res = await db.collection('records').add({ data: record })
      this.showToast(`已记录 😴 睡眠 ${app.formatDurationHour(duration)}`, res._id)
      this.loadRecords()
    } catch (err) {
      console.error('保存记录失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 尿布操作
  handleDiaper() {
    if (!app.globalData.babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }

    if (this.data.sleepRunning) {
      wx.showToast({ title: '请先结束睡眠', icon: 'none' })
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
      ts: app.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    try {
      const res = await db.collection('records').add({ data: record })
      const typeName = diaperType === 'pee' ? '小便' : (diaperType === 'poop' ? '大便' : '混合')
      this.showToast(`已记录 👶 ${typeName}`, res._id)
      this.setData({ showDiaperModal: false })
      this.loadRecords()
    } catch (err) {
      console.error('保存记录失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 更多操作
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

  // 体温记录
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
      ts: app.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    try {
      const res = await db.collection('records').add({ data: record })
      this.setData({ showTempModal: false })
      this.showToast(`已记录 🌡️ ${value}°C`, res._id)
      this.loadRecords()
    } catch (err) {
      console.error('保存体温失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 用药记录
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
      ts: app.getLocalISOString(),
      dateKey: this.data.currentDate
    }

    try {
      const res = await db.collection('records').add({ data: record })
      this.setData({ showMedModal: false })
      this.showToast(`已记录 💊 ${medName.trim()}`, res._id)
      this.loadRecords()
    } catch (err) {
      console.error('保存用药失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 删除记录
  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？'
    })

    if (!res.confirm) return

    try {
      await db.collection('records').doc(id).remove()
      wx.showToast({ title: '已删除', icon: 'success' })
      this.loadRecords()
    } catch (err) {
      console.error('删除记录失败', err)
      wx.showToast({ title: '删除失败', icon: 'error' })
    }
  },

  // Toast
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

    try {
      await db.collection('records').doc(this.data.undoRid).remove()
      this.hideToast()
      wx.showToast({ title: '已撤销', icon: 'success' })
      this.loadRecords()
    } catch (err) {
      console.error('撤销失败', err)
    }
  },

  // 页面跳转
  goToBaby() {
    wx.switchTab({ url: '/pages/baby/baby' })
  },

  goToHistory() {
    wx.switchTab({ url: '/pages/history/history' })
  },

  // 清理计时器
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

  // 保存计时状态（用于页面隐藏时恢复）
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

  // 恢复计时状态
  restoreTimerState() {
    const feedState = wx.getStorageSync('feedTimerState')
    if (feedState) {
      const elapsed = Math.floor((Date.now() - feedState.start) / 1000)
      if (elapsed < 7200) { // 2小时内恢复
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
      if (elapsed < 43200) { // 12小时内恢复
        this.setData({
          sleepRunning: true,
          sleepStart: sleepState.start
        })
        this.startSleepTimer()
      }
      wx.removeStorageSync('sleepTimerState')
    }
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
  }
})
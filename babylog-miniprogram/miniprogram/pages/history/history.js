// pages/history/history.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    // 日期范围
    startDate: '',
    endDate: '',
    startKey: '',
    endKey: '',

    // 周统计
    weekStats: {
      feedCount: 0,
      feedTotal: '0分',
      sleepTotal: '0分',
      diaperCount: 0
    },

    // 每日记录
    dailyRecords: []
  },

  onLoad() {
    this.initWeek()
  },

  onShow() {
    this.loadRecords()
  },

  // 初始化周
  initWeek() {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek) // 周日为起点

    const end = new Date(start)
    end.setDate(start.getDate() + 6) // 周六为终点

    this.setData({
      startKey: app.getDateKey(start),
      endKey: app.getDateKey(end),
      startDate: this.formatDateRange(start),
      endDate: this.formatDateRange(end)
    })
  },

  formatDateRange(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  // 周导航
  prevWeek() {
    const start = new Date(this.data.startKey)
    start.setDate(start.getDate() - 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    this.setData({
      startKey: app.getDateKey(start),
      endKey: app.getDateKey(end),
      startDate: this.formatDateRange(start),
      endDate: this.formatDateRange(end)
    })
    this.loadRecords()
  },

  nextWeek() {
    const start = new Date(this.data.startKey)
    start.setDate(start.getDate() + 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const today = app.getDateKey(new Date())
    if (app.getDateKey(start) > today) return

    this.setData({
      startKey: app.getDateKey(start),
      endKey: app.getDateKey(end),
      startDate: this.formatDateRange(start),
      endDate: this.formatDateRange(end)
    })
    this.loadRecords()
  },

  // 加载记录
  async loadRecords() {
    if (!app.globalData.babyId) {
      this.setData({
        weekStats: {
          feedCount: 0,
          feedTotal: '0分',
          sleepTotal: '0分',
          diaperCount: 0
        },
        dailyRecords: []
      })
      return
    }

    try {
      const res = await db.collection('records')
        .where({
          babyId: app.globalData.babyId,
          dateKey: db.command.gte(this.data.startKey)
            .and(db.command.lte(this.data.endKey))
        })
        .orderBy('ts', 'desc')
        .get()

      // 按日期分组
      const dailyMap = {}
      let weekStats = {
        feedCount: 0,
        feedDuration: 0,
        sleepDuration: 0,
        diaperCount: 0
      }

      res.data.forEach(r => {
        const dateKey = r.dateKey
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            date: dateKey,
            formattedDate: app.formatDate(dateKey),
            records: [],
            stats: {
              feedCount: 0,
              feedDuration: 0,
              sleepDuration: 0,
              diaperCount: 0
            }
          }
        }

        // 格式化记录
        const record = this.formatRecord(r)
        dailyMap[dateKey].records.push(record)

        // 统计
        if (r.type === 'feed') {
          dailyMap[dateKey].stats.feedCount++
          weekStats.feedCount++
          if (r.duration) {
            dailyMap[dateKey].stats.feedDuration += r.duration
            weekStats.feedDuration += r.duration
          }
        } else if (r.type === 'sleep') {
          dailyMap[dateKey].stats.sleepDuration += r.duration || 0
          weekStats.sleepDuration += r.duration || 0
        } else if (r.type === 'diaper') {
          dailyMap[dateKey].stats.diaperCount++
          weekStats.diaperCount++
        }
      })

      // 转换为数组并排序
      const dailyRecords = Object.values(dailyMap)
        .map(day => ({
          ...day,
          stats: {
            feedCount: day.stats.feedCount,
            feedDuration: app.formatDuration(day.stats.feedDuration),
            sleepDuration: app.formatDurationHour(day.stats.sleepDuration),
            diaperCount: day.stats.diaperCount
          }
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      this.setData({
        dailyRecords,
        weekStats: {
          feedCount: weekStats.feedCount,
          feedTotal: app.formatDuration(weekStats.feedDuration),
          sleepTotal: app.formatDurationHour(weekStats.sleepDuration),
          diaperCount: weekStats.diaperCount
        }
      })
    } catch (err) {
      console.error('加载记录失败', err)
    }
  },

  formatRecord(r) {
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
    }

    return item
  }
})
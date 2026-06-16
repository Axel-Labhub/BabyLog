const app = getApp()
const DB = require('../../utils/db')
const Formatter = require('../../utils/formatter')

Page({
  data: {
    startDate: '',
    endDate: '',
    startKey: '',
    endKey: '',
    weekStats: {
      feedCount: 0,
      feedTotal: '0分',
      sleepTotal: '0分',
      diaperCount: 0,
      tempCount: 0,
      medCount: 0
    },
    dailyRecords: [],
    loading: false
  },

  onLoad() {
    this.initWeek()
  },

  onShow() {
    this.loadRecords()
  },

  initWeek() {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    this.setData({
      startKey: Formatter.getDateKey(start),
      endKey: Formatter.getDateKey(end),
      startDate: this.formatDateRange(start),
      endDate: this.formatDateRange(end)
    })
  },

  formatDateRange(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  prevWeek() {
    const start = new Date(this.data.startKey)
    start.setDate(start.getDate() - 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    this.setData({
      startKey: Formatter.getDateKey(start),
      endKey: Formatter.getDateKey(end),
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

    const today = Formatter.getDateKey(new Date())
    if (Formatter.getDateKey(start) > today) return

    this.setData({
      startKey: Formatter.getDateKey(start),
      endKey: Formatter.getDateKey(end),
      startDate: this.formatDateRange(start),
      endDate: this.formatDateRange(end)
    })
    this.loadRecords()
  },

  async loadRecords() {
    if (!app.globalData.babyId) {
      this.setData({
        weekStats: {
          feedCount: 0,
          feedTotal: '0分',
          sleepTotal: '0分',
          diaperCount: 0,
          tempCount: 0,
          medCount: 0
        },
        dailyRecords: [],
        loading: false
      })
      return
    }

    this.setData({ loading: true })

    try {
      const res = await DB.query('records', {
        babyId: app.globalData.babyId,
        dateKey: wx.cloud.database().command.gte(this.data.startKey)
          .and(wx.cloud.database().command.lte(this.data.endKey))
      }, {
        orderBy: { field: 'ts', direction: 'desc' }
      })

      if (!res.success) {
        this.setData({ loading: false })
        return
      }

      const dailyMap = {}
      let weekStats = {
        feedCount: 0,
        feedDuration: 0,
        sleepDuration: 0,
        diaperCount: 0,
        tempCount: 0,
        medCount: 0
      }

      res.data.forEach(r => {
        const dateKey = r.dateKey
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            date: dateKey,
            formattedDate: Formatter.formatDate(dateKey),
            records: [],
            stats: {
              feedCount: 0,
              feedDuration: 0,
              sleepDuration: 0,
              diaperCount: 0,
              tempCount: 0,
              medCount: 0
            }
          }
        }

        const record = Formatter.formatRecord(r)
        dailyMap[dateKey].records.push(record)

        switch (r.type) {
          case 'feed':
            dailyMap[dateKey].stats.feedCount++
            weekStats.feedCount++
            if (r.duration) {
              dailyMap[dateKey].stats.feedDuration += r.duration
              weekStats.feedDuration += r.duration
            }
            break
          case 'sleep':
            dailyMap[dateKey].stats.sleepDuration += r.duration || 0
            weekStats.sleepDuration += r.duration || 0
            break
          case 'diaper':
            dailyMap[dateKey].stats.diaperCount++
            weekStats.diaperCount++
            break
          case 'temperature':
            dailyMap[dateKey].stats.tempCount++
            weekStats.tempCount++
            break
          case 'medicine':
            dailyMap[dateKey].stats.medCount++
            weekStats.medCount++
            break
        }
      })

      const dailyRecords = Object.values(dailyMap)
        .map(day => ({
          ...day,
          stats: {
            feedCount: day.stats.feedCount,
            feedDuration: Formatter.formatDuration(day.stats.feedDuration),
            sleepDuration: Formatter.formatDurationHour(day.stats.sleepDuration),
            diaperCount: day.stats.diaperCount,
            tempCount: day.stats.tempCount,
            medCount: day.stats.medCount
          }
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      this.setData({
        dailyRecords,
        weekStats: {
          feedCount: weekStats.feedCount,
          feedTotal: Formatter.formatDuration(weekStats.feedDuration),
          sleepTotal: Formatter.formatDurationHour(weekStats.sleepDuration),
          diaperCount: weekStats.diaperCount,
          tempCount: weekStats.tempCount,
          medCount: weekStats.medCount
        }
      })
    } catch (err) {
      console.error('加载记录失败', err)
    } finally {
      this.setData({ loading: false })
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
  }
})

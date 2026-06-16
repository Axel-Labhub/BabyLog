class Formatter {
  static formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m === 0) return `${s}秒`
    if (s === 0) return `${m}分钟`
    return `${m}分${s}秒`
  }

  static formatDurationHour(seconds) {
    if (!seconds || seconds < 0) return '0分钟'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h === 0) return `${m}分钟`
    if (m === 0) return `${h}小时`
    return `${h}小时${m}分钟`
  }

  static formatTime(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  static formatDate(dateKey) {
    const today = this.getDateKey(new Date())
    const yesterday = this.getDateKey(new Date(Date.now() - 86400000))

    if (dateKey === today) return '今天'
    if (dateKey === yesterday) return '昨天'

    const d = new Date(dateKey)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`
  }

  static getDateKey(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  static getLocalISOString(date) {
    const d = date || new Date()
    const y = d.getFullYear()
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    const h = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    const s = d.getSeconds().toString().padStart(2, '0')
    return `${y}-${m}-${day}T${h}:${min}:${s}`
  }

  static calculateBabyAge(birthDate) {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    birth.setHours(0, 0, 0, 0)
    const diff = today - birth
    return Math.floor(diff / 86400000) + 1
  }

  static formatBabyAge(birthDate) {
    const days = this.calculateBabyAge(birthDate)
    if (days <= 30) return `${days}天`
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    if (remainingDays === 0) return `${months}个月`
    return `${months}个月${remainingDays}天`
  }

  static getTimeAgo(isoString) {
    if (!isoString) return ''
    const now = new Date()
    const time = new Date(isoString)
    const diffMs = now - time
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}小时前`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 7) return `${diffDay}天前`
    return this.formatDate(this.getDateKey(time))
  }

  static formatRecord(record) {
    const item = {
      id: record._id,
      type: record.type,
      time: this.formatTime(record.ts),
      icon: '',
      title: '',
      detail: '',
      timeAgo: this.getTimeAgo(record.ts)
    }

    const posMap = { forehead: '额温', ear: '耳温', armpit: '腋温', anus: '肛温' }

    switch (record.type) {
      case 'feed':
        item.icon = '🍼'
        if (record.feedType === 'breast') {
          item.title = `母乳 ${record.side === 'left' ? '左' : '右'}侧`
          item.detail = this.formatDuration(record.duration)
        } else {
          item.title = '配方奶'
          item.detail = `${record.amount}ml`
        }
        break
      case 'sleep':
        item.icon = '😴'
        item.title = '睡眠'
        item.detail = this.formatDurationHour(record.duration)
        break
      case 'diaper':
        item.icon = record.diaperType === 'pee' ? '💧' : (record.diaperType === 'poop' ? '💩' : '💩💧')
        item.title = record.diaperType === 'pee' ? '小便' : (record.diaperType === 'poop' ? '大便' : '混合')
        if (record.diaperType !== 'pee') {
          item.detail = `${record.poopColor || ''} ${record.poopConsistency || ''}`.trim()
        }
        break
      case 'temperature':
        item.icon = '🌡️'
        item.title = '体温'
        item.detail = `${record.value}°C ${posMap[record.position] || ''}`.trim()
        break
      case 'medicine':
        item.icon = '💊'
        item.title = `用药 ${record.name || ''}`.trim()
        item.detail = `${record.dosage || ''}${record.unit || ''} ${record.note || ''}`.trim()
        break
      default:
        item.icon = '📝'
        item.title = '记录'
    }

    return item
  }

  static calculateDailyStats(records) {
    let feedCount = 0
    let feedDuration = 0
    let sleepDuration = 0
    let diaperCount = 0
    let tempCount = 0
    let medCount = 0

    records.forEach(r => {
      switch (r.type) {
        case 'feed':
          feedCount++
          if (r.duration) feedDuration += r.duration
          break
        case 'sleep':
          sleepDuration += r.duration || 0
          break
        case 'diaper':
          diaperCount++
          break
        case 'temperature':
          tempCount++
          break
        case 'medicine':
          medCount++
          break
      }
    })

    return {
      feedCount,
      feedDuration: this.formatDuration(feedDuration),
      sleepDuration: this.formatDurationHour(sleepDuration),
      diaperCount,
      tempCount,
      medCount,
      totalCount: records.length
    }
  }

  static generateId() {
    return Date.now().toString(36) + Math.random().toString(16).slice(2, 6)
  }
}

module.exports = Formatter

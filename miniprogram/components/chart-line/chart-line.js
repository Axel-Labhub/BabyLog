Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    subtitle: {
      type: String,
      value: ''
    },
    data: {
      type: Array,
      value: []
    },
    color: {
      type: String,
      value: '#8B5CF6'
    },
    unit: {
      type: String,
      value: ''
    }
  },

  computed: {
    dataPoints() {
      const data = this.properties.data
      if (!data || data.length === 0) return []

      const labels = ['日', '一', '二', '三', '四', '五', '六']

      return data.map(item => ({
        date: item.date,
        value: item.value,
        label: labels[new Date(item.date).getDay()] || item.date.slice(5)
      }))
    },

    points() {
      const data = this.properties.data
      if (!data || data.length === 0) return []

      const maxValue = Math.max(...data.map(d => d.value), 1)
      const stepX = data.length > 1 ? 100 / (data.length - 1) : 0

      return data.map((item, index) => ({
        x: index * stepX,
        y: 100 - (item.value / maxValue) * 100
      }))
    },

    linePath() {
      const points = this.points
      if (points.length === 0) return ''

      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    },

    areaPath() {
      const points = this.points
      if (points.length === 0) return ''

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      const lastX = points[points.length - 1].x

      return `${linePath} L ${lastX} 100 L 0 100 Z`
    },

    yLabels() {
      const data = this.properties.data
      if (!data || data.length === 0) return ['0', '25', '50', '75', '100']

      const maxValue = Math.max(...data.map(d => d.value), 100)
      const step = Math.ceil(maxValue / 4)

      return [0, step, step * 2, step * 3, maxValue].map(v => v + this.properties.unit)
    },

    gridLines() {
      return [1, 2, 3, 4]
    }
  }
})

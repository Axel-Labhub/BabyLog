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
      value: '#FF9500'
    },
    unit: {
      type: String,
      value: ''
    }
  },

  computed: {
    chartData() {
      const data = this.properties.data
      if (!data || data.length === 0) return []

      const maxValue = Math.max(...data.map(d => d.value)) || 1
      const labels = ['日', '一', '二', '三', '四', '五', '六']

      return data.map((item, index) => ({
        date: item.date,
        value: item.value + this.properties.unit,
        height: Math.max((item.value / maxValue) * 100, 5),
        label: labels[new Date(item.date).getDay()] || item.date.slice(5)
      }))
    },

    yLabels() {
      const data = this.properties.data
      if (!data || data.length === 0) return ['0', '25', '50', '75', '100']

      const maxValue = Math.max(...data.map(d => d.value)) || 100
      const step = Math.ceil(maxValue / 4)

      return [0, step, step * 2, step * 3, maxValue].map(v => v + this.properties.unit)
    },

    gridLines() {
      return [1, 2, 3, 4]
    }
  }
})

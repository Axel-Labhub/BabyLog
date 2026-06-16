const app = getApp()
const DB = require('../../utils/db')
const Formatter = require('../../utils/formatter')

Page({
  data: {
    currentBaby: null,
    babyAge: '',
    otherBabies: [],
    members: [],
    today: '',
    showCreateModal: false,
    newBabyName: '',
    newBabyBirth: '',
    showEditModal: false,
    editBabyName: '',
    editBabyBirth: '',
    showJoinModal: false,
    showQRModal: false,
    qrCodeUrl: '',
    loading: false
  },

  onLoad() {
    this.setData({
      today: Formatter.getDateKey(new Date())
    })
    this.initDarkMode()
  },

  onShow() {
    this.loadBabies()
  },

  async loadBabies() {
    const userId = app.globalData.userId
    this.setData({ loading: true })

    try {
      const res = await DB.query('babies', {
        members: userId
      }, {
        orderBy: { field: 'createdAt', direction: 'desc' }
      })

      if (res.success) {
        const babies = res.data
        const currentBabyId = app.globalData.babyId || wx.getStorageSync('currentBabyId')

        let currentBaby = null
        let otherBabies = []

        if (currentBabyId) {
          currentBaby = babies.find(b => b._id === currentBabyId)
          otherBabies = babies.filter(b => b._id !== currentBabyId)
        } else if (babies.length > 0) {
          currentBaby = babies[0]
          otherBabies = babies.slice(1)
          this.setCurrentBaby(currentBaby)
        }

        this.setData({
          currentBaby,
          otherBabies,
          babyAge: currentBaby ? Formatter.formatBabyAge(currentBaby.birthDate) : ''
        })

        if (currentBaby) {
          this.loadMembers(currentBaby._id)
        }
      }
    } catch (err) {
      console.error('加载宝宝列表失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMembers(babyId) {
    try {
      const res = await DB.get('babies', babyId)
      if (!res.success) return

      const baby = res.data
      const memberIds = baby.members || []

      const members = memberIds.map(id => ({
        userId: id,
        isOwner: id === baby.ownerId,
        nickname: id === baby.ownerId ? '创建者' : `成员${memberIds.indexOf(id) + 1}`
      }))

      try {
        const userRes = await DB.query('users', {
          _id: wx.cloud.database().command.in(memberIds)
        })

        if (userRes.success) {
          userRes.data.forEach(user => {
            const member = members.find(m => m.userId === user._id)
            if (member) {
              member.nickname = user.nickname || member.nickname
            }
          })
        }
      } catch (e) {
      }

      this.setData({ members })
    } catch (err) {
      console.error('加载成员失败', err)
    }
  },

  setCurrentBaby(baby) {
    app.globalData.babyId = baby._id
    app.globalData.babyInfo = baby
    wx.setStorageSync('currentBabyId', baby._id)
  },

  createBaby() {
    this.setData({
      showCreateModal: true,
      newBabyName: '',
      newBabyBirth: ''
    })
  },

  hideCreateModal() {
    this.setData({ showCreateModal: false })
  },

  onBabyNameInput(e) {
    this.setData({ newBabyName: e.detail.value })
  },

  onBabyBirthChange(e) {
    this.setData({ newBabyBirth: e.detail.value })
  },

  async confirmCreate() {
    const { newBabyName, newBabyBirth } = this.data

    if (!newBabyName.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' })
      return
    }

    if (!newBabyBirth) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }

    const userId = app.globalData.userId

    const res = await DB.add('babies', {
      name: newBabyName.trim(),
      birthDate: newBabyBirth,
      ownerId: userId,
      members: [userId],
      createdAt: Formatter.getLocalISOString()
    })

    if (res.success) {
      this.setData({ showCreateModal: false })

      const baby = {
        _id: res.data._id,
        name: newBabyName.trim(),
        birthDate: newBabyBirth,
        ownerId: userId,
        members: [userId]
      }

      this.setCurrentBaby(baby)
      this.loadBabies()
      wx.showToast({ title: '创建成功', icon: 'success' })
    } else {
      wx.showToast({ title: '创建失败', icon: 'error' })
    }
  },

  editBaby() {
    const baby = this.data.currentBaby
    this.setData({
      showEditModal: true,
      editBabyName: baby.name,
      editBabyBirth: baby.birthDate
    })
  },

  hideEditModal() {
    this.setData({ showEditModal: false })
  },

  onEditBabyNameInput(e) {
    this.setData({ editBabyName: e.detail.value })
  },

  onEditBabyBirthChange(e) {
    this.setData({ editBabyBirth: e.detail.value })
  },

  async confirmEdit() {
    const { editBabyName, editBabyBirth } = this.data
    const babyId = this.data.currentBaby._id

    if (!editBabyName.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' })
      return
    }

    if (!editBabyBirth) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }

    const res = await DB.update('babies', babyId, {
      name: editBabyName.trim(),
      birthDate: editBabyBirth
    })

    if (res.success) {
      this.setData({ showEditModal: false })
      this.loadBabies()
      wx.showToast({ title: '保存成功', icon: 'success' })
    } else {
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  async deleteBaby() {
    const babyId = this.data.currentBaby._id

    const res = await wx.showModal({
      title: '确认删除',
      content: '删除宝宝将清除所有记录，此操作不可恢复！'
    })

    if (!res.confirm) return

    const delRes = await DB.remove('babies', babyId)
    if (!delRes.success) {
      wx.showToast({ title: '删除失败', icon: 'error' })
      return
    }

    await DB.batchRemove('records', { babyId })

    app.globalData.babyId = null
    app.globalData.babyInfo = null
    wx.removeStorageSync('currentBabyId')

    this.setData({ showEditModal: false })
    this.loadBabies()
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  switchBaby(e) {
    const babyId = e.currentTarget.dataset.id
    const baby = this.data.otherBabies.find(b => b._id === babyId)

    if (baby) {
      this.setCurrentBaby(baby)
      this.loadBabies()
      wx.showToast({ title: `已切换到 ${baby.name}`, icon: 'success' })
    }
  },

  showJoinModal() {
    this.setData({ showJoinModal: true })
  },

  hideJoinModal() {
    this.setData({ showJoinModal: false })
  },

  async showQRCode() {
    if (!this.data.currentBaby) return

    this.setData({
      showQRModal: true,
      qrCodeUrl: ''
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getQRCode',
        data: {
          babyId: this.data.currentBaby._id
        }
      })

      if (res.result && res.result.fileID) {
        const fileRes = await wx.cloud.getTempFileURL({
          fileList: [res.result.fileID]
        })

        if (fileRes.fileList && fileRes.fileList[0]) {
          this.setData({
            qrCodeUrl: fileRes.fileList[0].tempFileURL
          })
        }
      }
    } catch (err) {
      console.error('生成小程序码失败', err)
      wx.showToast({ title: '生成失败', icon: 'error' })
    }
  },

  hideQRModal() {
    this.setData({ showQRModal: false })
  },

  async saveQRCode() {
    if (!this.data.qrCodeUrl) return

    try {
      const res = await wx.downloadFile({
        url: this.data.qrCodeUrl,
        success: (downloadRes) => {
          wx.saveImageToPhotosAlbum({
            filePath: downloadRes.tempFilePath,
            success: () => {
              wx.showToast({ title: '已保存到相册', icon: 'success' })
            },
            fail: (err) => {
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要授权保存图片到相册',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting()
                    }
                  }
                })
              } else {
                wx.showToast({ title: '保存失败', icon: 'error' })
              }
            }
          })
        }
      })
    } catch (err) {
      console.error('保存小程序码失败', err)
    }
  },

  initDarkMode() {
    const darkMode = wx.getStorageSync('darkMode') || false
    if (darkMode) {
      this.setStyle({ className: 'dark' })
    }
  }
})

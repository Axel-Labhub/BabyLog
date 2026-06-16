// pages/baby/baby.js
const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    // 当前宝宝
    currentBaby: null,
    babyAge: 0,

    // 其他宝宝列表
    otherBabies: [],

    // 成员列表
    members: [],

    // 日期
    today: '',

    // 弹窗状态
    showCreateModal: false,
    newBabyName: '',
    newBabyBirth: '',

    showEditModal: false,
    editBabyName: '',
    editBabyBirth: '',

    showJoinModal: false,

    showQRModal: false,
    qrCodeUrl: ''
  },

  onLoad() {
    this.setData({
      today: app.getDateKey(new Date())
    })
  },

  onShow() {
    this.loadBabies()
  },

  // 加载宝宝列表
  async loadBabies() {
    const userId = app.globalData.userId

    try {
      // 查询用户参与的宝宝
      const res = await db.collection('babies')
        .where({
          members: userId
        })
        .orderBy('createdAt', 'desc')
        .get()

      const babies = res.data
      const currentBabyId = app.globalData.babyId || wx.getStorageSync('currentBabyId')

      let currentBaby = null
      let otherBabies = []

      if (currentBabyId) {
        currentBaby = babies.find(b => b._id === currentBabyId)
        otherBabies = babies.filter(b => b._id !== currentBabyId)
      } else if (babies.length > 0) {
        // 默认选择第一个
        currentBaby = babies[0]
        otherBabies = babies.slice(1)
        this.setCurrentBaby(currentBaby)
      }

      this.setData({
        currentBaby,
        otherBabies,
        babyAge: currentBaby ? this.calculateBabyAge(currentBaby.birthDate) : 0
      })

      if (currentBaby) {
        this.loadMembers(currentBaby._id)
      }
    } catch (err) {
      console.error('加载宝宝列表失败', err)
    }
  },

  // 加载成员
  async loadMembers(babyId) {
    try {
      const res = await db.collection('babies').doc(babyId).get()
      const baby = res.data

      // 查询成员信息
      const memberIds = baby.members || []
      const members = memberIds.map(id => ({
        userId: id,
        isOwner: id === baby.ownerId,
        nickname: ''
      }))

      // 尝试获取成员昵称（如果有用户表）
      try {
        const userRes = await db.collection('users')
          .where({
            _id: db.command.in(memberIds)
          })
          .get()

        userRes.data.forEach(user => {
          const member = members.find(m => m.userId === user._id)
          if (member) {
            member.nickname = user.nickname || ''
          }
        })
      } catch (e) {
        // 用户表可能不存在，忽略
      }

      this.setData({ members })
    } catch (err) {
      console.error('加载成员失败', err)
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

  // 设置当前宝宝
  setCurrentBaby(baby) {
    app.globalData.babyId = baby._id
    app.globalData.babyInfo = baby
    wx.setStorageSync('currentBabyId', baby._id)
  },

  // 创建宝宝
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

    try {
      const res = await db.collection('babies').add({
        data: {
          name: newBabyName.trim(),
          birthDate: newBabyBirth,
          ownerId: userId,
          members: [userId],
          createdAt: app.getLocalISOString()
        }
      })

      this.setData({ showCreateModal: false })

      // 设置为当前宝宝
      const baby = {
        _id: res._id,
        name: newBabyName.trim(),
        birthDate: newBabyBirth,
        ownerId: userId,
        members: [userId]
      }

      this.setCurrentBaby(baby)
      this.loadBabies()

      wx.showToast({ title: '创建成功', icon: 'success' })
    } catch (err) {
      console.error('创建宝宝失败', err)
      wx.showToast({ title: '创建失败', icon: 'error' })
    }
  },

  // 编辑宝宝
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

    try {
      await db.collection('babies').doc(babyId).update({
        data: {
          name: editBabyName.trim(),
          birthDate: editBabyBirth
        }
      })

      this.setData({ showEditModal: false })
      this.loadBabies()

      wx.showToast({ title: '保存成功', icon: 'success' })
    } catch (err) {
      console.error('编辑宝宝失败', err)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 删除宝宝
  async deleteBaby() {
    const babyId = this.data.currentBaby._id

    const res = await wx.showModal({
      title: '确认删除',
      content: '删除宝宝将清除所有记录，此操作不可恢复！'
    })

    if (!res.confirm) return

    try {
      // 删除宝宝
      await db.collection('babies').doc(babyId).remove()

      // 删除相关记录
      await db.collection('records')
        .where({ babyId })
        .remove()

      // 清除当前宝宝
      app.globalData.babyId = null
      app.globalData.babyInfo = null
      wx.removeStorageSync('currentBabyId')

      this.setData({ showEditModal: false })
      this.loadBabies()

      wx.showToast({ title: '已删除', icon: 'success' })
    } catch (err) {
      console.error('删除宝宝失败', err)
      wx.showToast({ title: '删除失败', icon: 'error' })
    }
  },

  // 切换宝宝
  switchBaby(e) {
    const babyId = e.currentTarget.dataset.id
    const baby = this.data.otherBabies.find(b => b._id === babyId)

    if (baby) {
      this.setCurrentBaby(baby)
      this.loadBabies()
      wx.showToast({ title: `已切换到 ${baby.name}`, icon: 'success' })
    }
  },

  // 加入宝宝
  showJoinModal() {
    this.setData({ showJoinModal: true })
  },

  hideJoinModal() {
    this.setData({ showJoinModal: false })
  },

  // 显示小程序码
  async showQRCode() {
    if (!this.data.currentBaby) return

    this.setData({
      showQRModal: true,
      qrCodeUrl: ''
    })

    try {
      // 调用云函数生成小程序码
      const res = await wx.cloud.callFunction({
        name: 'getQRCode',
        data: {
          babyId: this.data.currentBaby._id
        }
      })

      if (res.result && res.result.fileID) {
        // 获取临时下载链接
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

  // 保存小程序码
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
  }
})
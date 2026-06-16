// 云函数：生成小程序码
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_ENV })

exports.main = async (event, context) => {
  const { babyId } = event

  // 参数校验
  if (!babyId) {
    return {
      success: false,
      error: { errMsg: 'babyId 不能为空' }
    }
  }

  if (typeof babyId !== 'string' || babyId.length > 32) {
    return {
      success: false,
      error: { errMsg: 'babyId 格式错误，最大 32 字符' }
    }
  }

  try {
    // 生成小程序码
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene: babyId,
      page: 'pages/index/index',
      width: 430,
      auto_color: false,
      line_color: { r: 255, g: 149, b: 0 },
      is_hyaline: false
    })

    if (!res || !res.buffer) {
      return {
        success: false,
        error: { errMsg: '生成小程序码失败：返回数据为空' }
      }
    }

    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `qrcodes/${babyId}_${Date.now()}.png`,
      fileContent: res.buffer
    })

    if (!uploadRes || !uploadRes.fileID) {
      return {
        success: false,
        error: { errMsg: '上传到云存储失败' }
      }
    }

    return {
      success: true,
      fileID: uploadRes.fileID
    }
  } catch (err) {
    console.error('生成小程序码失败', err)
    return {
      success: false,
      error: {
        errCode: err.errCode || -1,
        errMsg: err.errMsg || '生成小程序码失败'
      }
    }
  }
}

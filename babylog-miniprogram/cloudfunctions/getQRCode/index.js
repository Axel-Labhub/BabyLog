// 云函数：生成小程序码
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_ENV })

exports.main = async (event, context) => {
  const { babyId } = event

  try {
    // 生成小程序码
    const res = await cloud.openapi.wxacode.getUnlimited({
      scene: babyId, // 场景值，最大32个字符
      page: 'pages/index/index', // 扫码进入的页面
      width: 430,
      auto_color: false,
      line_color: { r: 255, g: 149, b: 0 }, // 橙色线条
      is_hyaline: false // 不透明背景
    })

    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `qrcodes/${babyId}_${Date.now()}.png`,
      fileContent: res.buffer
    })

    return {
      success: true,
      fileID: uploadRes.fileID
    }
  } catch (err) {
    console.error('生成小程序码失败', err)
    return {
      success: false,
      error: err
    }
  }
}
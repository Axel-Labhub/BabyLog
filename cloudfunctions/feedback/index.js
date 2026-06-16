const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { content, contact, userId } = event

    if (!content || !content.trim()) {
      return { success: false, message: '请输入反馈内容' }
    }

    const result = await db.collection('feedbacks').add({
      data: {
        content: content.trim(),
        contact: contact || '',
        userId: userId || '',
        createdAt: new Date().toISOString(),
        status: 'pending'
      }
    })

    return {
      success: true,
      message: '反馈提交成功',
      data: result
    }
  } catch (err) {
    console.error('提交反馈失败', err)
    return { success: false, message: '提交失败，请重试' }
  }
}

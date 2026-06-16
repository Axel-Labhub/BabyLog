const cloud = require('wx-server-sdk')

async function initDatabase() {
  try {
    cloud.init({ env: cloud.DYNAMIC_ENV })
    const db = cloud.database()

    const collections = ['babies', 'records', 'users']

    for (const coll of collections) {
      try {
        await db.collection(coll).get()
        console.log(`集合 ${coll} 已存在`)
      } catch (err) {
        if (err.errCode === -30001) {
          try {
            await db.createCollection(coll)
            console.log(`集合 ${coll} 创建成功`)
          } catch (createErr) {
            console.error(`创建集合 ${coll} 失败:`, createErr)
          }
        } else {
          console.error(`检查集合 ${coll} 失败:`, err)
        }
      }
    }

    console.log('\n数据库初始化完成！')
    console.log('请在云开发控制台设置集合权限：')
    console.log('- babies: 仅创建者可读写，所有人可读')
    console.log('- records: 仅创建者可读写，所有人可读')
    console.log('- users: 仅创建者可读写')

  } catch (err) {
    console.error('初始化数据库失败:', err)
  }
}

initDatabase()
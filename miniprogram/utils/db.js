const db = wx.cloud.database()
const _ = db.command

class DB {
  static async add(collection, data) {
    try {
      const res = await db.collection(collection).add({ data })
      return { success: true, data: res }
    } catch (err) {
      console.error(`[DB] add ${collection} failed:`, err)
      return { success: false, error: err }
    }
  }

  static async get(collection, id) {
    try {
      const res = await db.collection(collection).doc(id).get()
      return { success: true, data: res.data }
    } catch (err) {
      console.error(`[DB] get ${collection}/${id} failed:`, err)
      return { success: false, error: err }
    }
  }

  static async update(collection, id, data) {
    try {
      const res = await db.collection(collection).doc(id).update({ data })
      return { success: true, data: res }
    } catch (err) {
      console.error(`[DB] update ${collection}/${id} failed:`, err)
      return { success: false, error: err }
    }
  }

  static async remove(collection, id) {
    try {
      const res = await db.collection(collection).doc(id).remove()
      return { success: true, data: res }
    } catch (err) {
      console.error(`[DB] remove ${collection}/${id} failed:`, err)
      return { success: false, error: err }
    }
  }

  static async query(collection, where, options = {}) {
    try {
      let query = db.collection(collection)
      if (where) query = query.where(where)
      if (options.orderBy) query = query.orderBy(options.orderBy.field, options.orderBy.direction)
      if (options.limit) query = query.limit(options.limit)
      if (options.skip) query = query.skip(options.skip)
      const res = await query.get()
      return { success: true, data: res.data }
    } catch (err) {
      console.error(`[DB] query ${collection} failed:`, err)
      return { success: false, error: err }
    }
  }

  static async batchRemove(collection, where) {
    try {
      const res = await db.collection(collection).where(where).remove()
      return { success: true, data: res }
    } catch (err) {
      console.error(`[DB] batchRemove ${collection} failed:`, err)
      return { success: false, error: err }
    }
  }

  static push(collection, id, field, value) {
    return this.update(collection, id, {
      [field]: _.push(value)
    })
  }

  static pull(collection, id, field, value) {
    return this.update(collection, id, {
      [field]: _.pull(value)
    })
  }
}

module.exports = DB

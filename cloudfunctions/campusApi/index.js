const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command
const COLLECTIONS = ['users', 'tasks', 'orders', 'messages', 'conversations', 'reports', 'system_meta']
const TASK_CATEGORIES = ['校园跑腿', '跳蚤市场', '自由任务']
const RISKY_CONTENT = /(代写|论文|作业|代考|代课|替签到|刷单|跑分|银行卡|贷款|赌博|色情|陪酒|代实名|培训费|先交押金)/i
const OFF_PLATFORM_CONTENT = /(1\d{10})|(微信|vx|v信|加我|二维码|支付宝|线下转账)/i

function ok(data) {
  return { ok: true, data }
}

function fail(error) {
  const message = error && error.message ? error.message : String(error || '云端服务异常')
  console.error('[campusApi]', error)
  return { ok: false, error: message }
}

function now() {
  return new Date()
}

function plusMs(value) {
  return new Date(Date.now() + value)
}

function toIso(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizeMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function normalizeCategory(value) {
  return TASK_CATEGORIES.includes(value) ? value : '自由任务'
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function maskPhone(phone) {
  const value = String(phone || '')
  return value.length === 11 ? `${value.slice(0, 3)}****${value.slice(-4)}` : ''
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user._id,
    nickname: user.nickname || '青蜓同学',
    school: user.school || '待认证学校',
    campus: user.campus || '待认证校区',
    verified: Boolean(user.verified),
    stars: Number(user.stars || 5),
    completed: Number(user.completed || 0),
    onTimeRate: Number(user.onTimeRate || 100),
    avatarText: user.avatarText || '青'
  }
}

function selfUser(user) {
  return {
    ...publicUser(user),
    phoneMasked: user.phoneMasked || '',
    studentNoMasked: user.studentNoMasked || '',
    verificationMode: user.verificationMode || 'none',
    walletBalance: normalizeMoney(user.walletBalance)
  }
}

function serializeTask(task, publisher, currentUserId) {
  return {
    id: task._id,
    publisherId: task.publisherId,
    title: task.title,
    category: normalizeCategory(task.category),
    description: task.description,
    delivery: task.delivery,
    location: task.location,
    school: task.school,
    campus: task.campus,
    amount: Number(task.amount),
    status: task.status,
    verified: Boolean(task.verified),
    expiresAt: toIso(task.expiresAt),
    serviceDueAt: toIso(task.serviceDueAt),
    serviceHours: Number(task.serviceHours || 24),
    extensionCount: Number(task.extensionCount || 0),
    createdAt: toIso(task.createdAt),
    note: task.note || '',
    publisher: publicUser(publisher),
    isMine: task.publisherId === currentUserId
  }
}

function serializeMessage(message, currentUserId) {
  return {
    id: message._id,
    senderId: message.senderId,
    content: message.content,
    createdAt: toIso(message.createdAt),
    isMine: message.senderId === currentUserId
  }
}

function serializeEvent(item) {
  return {
    id: item.id,
    actorId: item.actorId,
    title: item.title,
    detail: item.detail,
    createdAt: toIso(item.createdAt)
  }
}

function newEvent(actorId, title, detail) {
  return {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actorId,
    title,
    detail,
    createdAt: now()
  }
}

function statusText(status) {
  return {
    active: '进行中',
    grace: '顺延中',
    submitted: '待验收',
    disputed: '争议处理中',
    completed: '已完成',
    canceled: '已取消'
  }[status] || status
}

async function getUsersByIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const result = await db.collection('users').where({ _id: command.in(unique) }).limit(100).get()
  return result.data.reduce((map, user) => {
    map[user._id] = user
    return map
  }, {})
}

async function ensureCollections() {
  if (typeof db.createCollection !== 'function') return
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
    } catch (error) {
      const message = String(error && (error.errMsg || error.message) || '')
      if (!/exist|already|重复/i.test(message)) throw error
    }
  }
}

async function ensureUser(openid) {
  const result = await db.collection('users').where({ openid }).limit(1).get()
  if (result.data.length) {
    const existing = result.data[0]
    if (!Number.isFinite(Number(existing.walletBalance))) {
      await db.collection('users').doc(existing._id).update({ data: { walletBalance: 0, updatedAt: now() } })
      existing.walletBalance = 0
    }
    return existing
  }

  const createdAt = now()
  const user = {
    openid,
    nickname: '青蜓同学',
    school: '待认证学校',
    campus: '待认证校区',
    verified: false,
    stars: 5,
    completed: 0,
    onTimeRate: 100,
    avatarText: '青',
    phoneMasked: '',
    studentNoMasked: '',
    verificationMode: 'none',
    walletBalance: 0,
    status: 'active',
    createdAt,
    updatedAt: createdAt
  }
  try {
    const added = await db.collection('users').add({ data: user })
    return { ...user, _id: added._id }
  } catch (error) {
    // 配合 openid 唯一索引，处理同一用户首次并发请求。
    const retried = await db.collection('users').where({ openid }).limit(1).get()
    if (retried.data.length) return retried.data[0]
    throw error
  }
}

async function requireVerified(openid) {
  const user = await ensureUser(openid)
  if (user.status === 'banned') throw new Error('账号已被限制使用，请联系客服申诉')
  if (!user.verified) throw new Error('请先完成微信、手机和校园身份认证')
  return user
}

async function getOrderForUser(orderId, userId) {
  const result = await db.collection('orders').doc(orderId).get()
  const order = result.data
  if (!order || (order.publisherId !== userId && order.runnerId !== userId)) {
    throw new Error('订单不存在或无权查看')
  }
  return order
}

async function serializeOrder(order, currentUserId, includeMessages = false, cachedUsers = null) {
  const users = cachedUsers || await getUsersByIds([order.publisherId, order.runnerId])
  let messages = []
  let messageDocuments = []
  if (includeMessages) {
    const result = await db.collection('messages').where({ orderId: order._id }).limit(100).get()
    messageDocuments = result.data
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    messages = messageDocuments.map(item => serializeMessage(item, currentUserId))
  }
  const latestMessage = messageDocuments.length ? messageDocuments[messageDocuments.length - 1] : null
  const unreadCount = messageDocuments.filter(item => item.recipientId === currentUserId && !item.readAt).length
  return {
    id: order._id,
    taskId: order.taskId,
    title: order.title,
    publisherId: order.publisherId,
    runnerId: order.runnerId,
    amount: Number(order.amount),
    status: order.status,
    statusText: statusText(order.status),
    paymentStatus: order.paymentStatus,
    school: order.school,
    serviceDueAt: toIso(order.serviceDueAt),
    submittedAt: toIso(order.submittedAt),
    autoConfirmAt: toIso(order.autoConfirmAt),
    graceUntil: toIso(order.graceUntil),
    evidence: order.evidence || '',
    disputeReason: order.disputeReason || '',
    createdAt: toIso(order.createdAt),
    completedAt: toIso(order.completedAt),
    hiddenAt: toIso(order.hiddenAt),
    events: (order.events || []).map(serializeEvent),
    messages,
    hasMessages: messageDocuments.length > 0,
    lastMessagePreview: latestMessage ? latestMessage.content : '',
    lastMessageAt: latestMessage ? toIso(latestMessage.createdAt) : null,
    unreadCount,
    publisher: publicUser(users[order.publisherId]),
    runner: publicUser(users[order.runnerId]),
    role: order.publisherId === currentUserId ? 'publisher' : 'runner'
  }
}

function inquiryDocumentId(taskId, inquirerId) {
  return `inquiry_${hash(`${taskId}:${inquirerId}`).slice(0, 32)}`
}

async function getInquiryForUser(conversationId, userId) {
  const result = await db.collection('conversations').doc(conversationId).get()
  const conversation = result.data
  if (!conversation || (conversation.publisherId !== userId && conversation.inquirerId !== userId)) {
    throw new Error('咨询不存在或无权查看')
  }
  return conversation
}

async function serializeInquiry(conversation, currentUserId, includeMessages = false, cachedUsers = null) {
  const users = cachedUsers || await getUsersByIds([conversation.publisherId, conversation.inquirerId])
  let messages = []
  if (includeMessages) {
    const result = await db.collection('messages').where({ conversationId: conversation._id }).limit(100).get()
    messages = result.data
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(item => serializeMessage(item, currentUserId))
  }
  const isPublisher = conversation.publisherId === currentUserId
  const peerId = isPublisher ? conversation.inquirerId : conversation.publisherId
  return {
    id: conversation._id,
    type: 'inquiry',
    taskId: conversation.taskId,
    title: conversation.title,
    amount: Number(conversation.amount || 0),
    status: conversation.status || 'open',
    statusText: conversation.status === 'closed' ? '咨询已结束' : '任务咨询',
    canSend: conversation.status !== 'closed',
    createdAt: toIso(conversation.createdAt),
    lastMessageAt: toIso(conversation.lastMessageAt),
    lastMessagePreview: conversation.lastMessagePreview || '',
    hasMessages: Boolean(conversation.lastMessagePreview),
    unreadCount: Number(isPublisher ? conversation.unreadForPublisher || 0 : conversation.unreadForInquirer || 0),
    role: isPublisher ? 'publisher' : 'inquirer',
    peer: publicUser(users[peerId]),
    publisher: publicUser(users[conversation.publisherId]),
    inquirer: publicUser(users[conversation.inquirerId]),
    messages
  }
}

async function sweepLifecycle() {
  const current = now()
  let expiredTasks = 0
  let updatedOrders = 0

  const taskResult = await db.collection('tasks').where({ status: 'open' }).limit(100).get()
  for (const task of taskResult.data) {
    if (new Date(task.expiresAt).getTime() <= current.getTime()) {
      await db.collection('tasks').doc(task._id).update({
        data: { status: 'expired', fundsStatus: task.fundsStatus === 'held' ? 'refunded' : task.fundsStatus, updatedAt: current }
      })
      if (task.fundsStatus === 'held') {
        await db.collection('users').doc(task.publisherId).update({ data: { walletBalance: command.inc(Number(task.amount)), updatedAt: current } })
      }
      expiredTasks += 1
    }
  }

  for (const status of ['active', 'grace', 'submitted']) {
    const orderResult = await db.collection('orders').where({ status }).limit(100).get()
    for (const order of orderResult.data) {
      if (status === 'submitted' && order.autoConfirmAt && new Date(order.autoConfirmAt).getTime() <= current.getTime()) {
        await db.collection('orders').doc(order._id).update({
          data: {
            status: 'completed',
            paymentStatus: 'simulated_settled',
            completedAt: current,
            hiddenAt: plusMs(7 * 86400000),
            events: command.push(newEvent('system', '系统自动验收', '发布者在24小时内未提出异议')),
            updatedAt: current
          }
        })
        if (order.paymentStatus === 'simulated_held') {
          await db.collection('users').doc(order.runnerId).update({ data: { walletBalance: command.inc(Number(order.amount)), completed: command.inc(1), updatedAt: current } })
        }
        updatedOrders += 1
      } else if (status === 'active' && new Date(order.serviceDueAt).getTime() <= current.getTime()) {
        await db.collection('orders').doc(order._id).update({
          data: {
            status: 'grace',
            graceUntil: plusMs(24 * 3600000),
            events: command.push(newEvent('system', '订单顺延24小时', '接单者未在履约截止时间前提交完成凭证')),
            updatedAt: current
          }
        })
        updatedOrders += 1
      } else if (status === 'grace' && order.graceUntil && new Date(order.graceUntil).getTime() <= current.getTime()) {
        await db.collection('orders').doc(order._id).update({
          data: {
            status: 'canceled',
            paymentStatus: 'simulated_refunded',
            hiddenAt: plusMs(7 * 86400000),
            events: command.push(newEvent('system', '订单自动取消', '顺延期结束后仍未提交，模拟款项原路退回')),
            updatedAt: current
          }
        })
        if (order.paymentStatus === 'simulated_held') {
          await db.collection('users').doc(order.publisherId).update({ data: { walletBalance: command.inc(Number(order.amount)), updatedAt: current } })
        }
        updatedOrders += 1
      }
    }
  }

  return { expiredTasks, updatedOrders }
}

const actions = {
  async bootstrap({ openid }) {
    await ensureCollections()
    const user = await ensureUser(openid)
    return { ready: true, user: selfUser(user) }
  },

  async session({ openid }) {
    const user = await ensureUser(openid)
    return { authenticated: Boolean(user.verified), user: selfUser(user) }
  },

  async completeOnboarding({ openid, payload }) {
    const phone = cleanText(payload.phone, 11)
    const school = cleanText(payload.school, 40)
    const campus = cleanText(payload.campus, 30)
    const studentNo = cleanText(payload.studentNo, 32)
    if (!/^1\d{10}$/.test(phone)) throw new Error('请填写正确手机号')
    if (!school || !campus) throw new Error('请填写学校和校区')
    if (studentNo.length < 6) throw new Error('校园卡号或学号至少6位')

    const user = await ensureUser(openid)
    await db.collection('users').doc(user._id).update({
      data: {
        school,
        campus,
        phoneMasked: maskPhone(phone),
        phoneHash: hash(`${openid}:${phone}`),
        studentNoMasked: `****${studentNo.slice(-4)}`,
        studentNoHash: hash(`${openid}:${studentNo}`),
        verified: true,
        verificationMode: 'development',
        updatedAt: now()
      }
    })
    const refreshed = await db.collection('users').doc(user._id).get()
    return selfUser(refreshed.data)
  },

  async rechargeWallet({ openid, payload }) {
    const user = await requireVerified(openid)
    const amount = normalizeMoney(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) throw new Error('充值金额必须在0至5000元之间')
    await db.collection('users').doc(user._id).update({
      data: { walletBalance: command.inc(amount), updatedAt: now() }
    })
    const refreshed = await db.collection('users').doc(user._id).get()
    return selfUser(refreshed.data)
  },

  async withdrawWallet({ openid, payload }) {
    const user = await requireVerified(openid)
    const amount = normalizeMoney(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) throw new Error('提现金额必须在0至5000元之间')
    return db.runTransaction(async transaction => {
      const current = (await transaction.collection('users').doc(user._id).get()).data
      if (normalizeMoney(current.walletBalance) < amount) throw new Error('钱包余额不足')
      await transaction.collection('users').doc(user._id).update({
        data: { walletBalance: normalizeMoney(current.walletBalance - amount), updatedAt: now() }
      })
      return selfUser({ ...current, walletBalance: normalizeMoney(current.walletBalance - amount) })
    })
  },

  async sweep() {
    return sweepLifecycle()
  },

  async listTasks({ openid, payload }) {
    const user = await ensureUser(openid)
    const filters = payload || {}
    const keyword = cleanText(filters.keyword, 50).toLowerCase()
    const selectedSchool = cleanText(filters.school, 40)
    const result = await db.collection('tasks').where({ status: 'open' }).limit(100).get()
    const tasks = result.data
      .filter(task => new Date(task.expiresAt).getTime() > Date.now())
      .filter(task => selectedSchool ? task.school === selectedSchool : (!user.verified || task.school === user.school))
      .filter(task => !filters.category || filters.category === '全部' || normalizeCategory(task.category) === filters.category)
      .filter(task => !filters.campus || filters.campus === '全部校区' || task.campus === filters.campus)
      .filter(task => !keyword || `${task.title}${task.category}${task.location}${task.description}`.toLowerCase().includes(keyword))
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    const users = await getUsersByIds(tasks.map(task => task.publisherId))
    return tasks.map(task => serializeTask(task, users[task.publisherId], user._id))
  },

  async getTask({ openid, payload }) {
    const user = await ensureUser(openid)
    if (!payload.id) return null
    try {
      const result = await db.collection('tasks').doc(payload.id).get()
      const task = result.data
      if (!task || task.status !== 'open' || new Date(task.expiresAt).getTime() <= Date.now()) return null
      const publisherResult = await db.collection('users').doc(task.publisherId).get()
      return serializeTask(task, publisherResult.data, user._id)
    } catch (error) {
      if (/not exist|不存在|DATABASE_DOCUMENT_NOT_EXIST/i.test(String(error && (error.errMsg || error.message)))) return null
      throw error
    }
  },

  async openTaskInquiry({ openid, payload }) {
    const user = await requireVerified(openid)
    const taskResult = await db.collection('tasks').doc(payload.id).get()
    const task = taskResult.data
    if (!task || task.status !== 'open' || new Date(task.expiresAt).getTime() <= Date.now()) {
      throw new Error('任务已下架，暂时不能咨询')
    }
    if (task.publisherId === user._id) throw new Error('不能咨询自己发布的任务')
    if (task.school !== user.school) throw new Error('只能咨询本人认证学校的任务')

    const conversationId = inquiryDocumentId(task._id, user._id)
    let conversation = null
    try {
      conversation = (await db.collection('conversations').doc(conversationId).get()).data
    } catch (error) {
      conversation = null
    }
    if (!conversation) {
      conversation = {
        taskId: task._id,
        title: task.title,
        amount: Number(task.amount),
        publisherId: task.publisherId,
        inquirerId: user._id,
        status: 'open',
        lastMessagePreview: '',
        lastMessageAt: null,
        unreadForPublisher: 0,
        unreadForInquirer: 0,
        createdAt: now(),
        updatedAt: now()
      }
      await db.collection('conversations').doc(conversationId).set({ data: conversation })
      conversation = { ...conversation, _id: conversationId }
    }
    return serializeInquiry(conversation, user._id, true)
  },

  async listTaskInquiries({ openid }) {
    const user = await requireVerified(openid)
    const [published, asked] = await Promise.all([
      db.collection('conversations').where({ publisherId: user._id }).limit(50).get(),
      db.collection('conversations').where({ inquirerId: user._id }).limit(50).get()
    ])
    const conversations = {}
    published.data.concat(asked.data).forEach(item => { conversations[item._id] = item })
    const sorted = Object.values(conversations)
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt))
    const users = await getUsersByIds(sorted.flatMap(item => [item.publisherId, item.inquirerId]))
    return Promise.all(sorted.map(item => serializeInquiry(item, user._id, false, users)))
  },

  async getTaskInquiry({ openid, payload }) {
    const user = await requireVerified(openid)
    const conversation = await getInquiryForUser(payload.id, user._id)
    return serializeInquiry(conversation, user._id, true)
  },

  async addTaskInquiryMessage({ openid, payload }) {
    const user = await requireVerified(openid)
    const conversation = await getInquiryForUser(payload.id, user._id)
    if (conversation.status === 'closed') throw new Error('该任务咨询已结束')
    const taskResult = await db.collection('tasks').doc(conversation.taskId).get()
    if (!taskResult.data || taskResult.data.status !== 'open' || new Date(taskResult.data.expiresAt).getTime() <= Date.now()) {
      throw new Error('任务已被接取或下架，咨询已结束')
    }
    const content = cleanText(payload.content, 200)
    if (!content) throw new Error('消息不能为空')
    if (OFF_PLATFORM_CONTENT.test(content)) throw new Error('为保护双方权益，请勿发送联系方式或引导线下转账')
    const recipientId = user._id === conversation.publisherId ? conversation.inquirerId : conversation.publisherId
    const createdAt = now()
    const message = { conversationId: conversation._id, senderId: user._id, recipientId, content, createdAt }
    const added = await db.collection('messages').add({ data: message })
    const unreadField = recipientId === conversation.publisherId ? 'unreadForPublisher' : 'unreadForInquirer'
    await db.collection('conversations').doc(conversation._id).update({
      data: {
        lastMessagePreview: content,
        lastMessageAt: createdAt,
        lastMessageSenderId: user._id,
        [unreadField]: command.inc(1),
        updatedAt: createdAt
      }
    })
    return serializeMessage({ ...message, _id: added._id }, user._id)
  },

  async markTaskInquiryRead({ openid, payload }) {
    const user = await requireVerified(openid)
    const conversation = await getInquiryForUser(payload.id, user._id)
    const unreadField = conversation.publisherId === user._id ? 'unreadForPublisher' : 'unreadForInquirer'
    await db.collection('conversations').doc(conversation._id).update({ data: { [unreadField]: 0, updatedAt: now() } })
    return { read: true }
  },

  async createTask({ openid, payload }) {
    const user = await requireVerified(openid)
    const title = cleanText(payload.title, 20)
    const note = cleanText(payload.note, 50)
    const description = cleanText(payload.description || note || title, 300)
    const delivery = cleanText(payload.delivery || '按任务标题和备注约定完成', 80)
    const location = cleanText(payload.location || `${user.campus}内`, 60)
    const category = cleanText(payload.category, 20)
    const amount = normalizeMoney(payload.amount)
    const expiryHours = Number(payload.expiryHours)
    const serviceHours = 24
    if (title.length < 2) throw new Error('任务标题至少2个字')
    if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) throw new Error('任务金额必须在0至2000元之间')
    if (!TASK_CATEGORIES.includes(category)) throw new Error('不支持该任务分类')
    if (![24, 72, 168, 336].includes(expiryHours)) throw new Error('任务时效参数无效')
    if (RISKY_CONTENT.test(`${title}${description}${delivery}${note}`)) throw new Error('任务可能涉及平台禁止的高风险服务')

    const createdAt = now()
    const task = {
      publisherId: user._id,
      title,
      category,
      description,
      delivery,
      location,
      school: user.school,
      campus: user.campus,
      amount,
      status: 'open',
      verified: true,
      expiresAt: plusMs(expiryHours * 3600000),
      serviceDueAt: plusMs(serviceHours * 3600000),
      serviceHours,
      extensionCount: 0,
      createdAt,
      updatedAt: createdAt,
      note,
      fundsStatus: 'held'
    }
    return db.runTransaction(async transaction => {
      const currentUser = (await transaction.collection('users').doc(user._id).get()).data
      if (normalizeMoney(currentUser.walletBalance) < amount) throw new Error('钱包余额不足，请先充值')
      await transaction.collection('users').doc(user._id).update({
        data: { walletBalance: normalizeMoney(currentUser.walletBalance - amount), updatedAt: createdAt }
      })
      const added = await transaction.collection('tasks').add({ data: task })
      return serializeTask({ ...task, _id: added._id }, currentUser, user._id)
    })
  },

  async extendTask({ openid, payload }) {
    const user = await requireVerified(openid)
    const days = Number(payload.days)
    if (![1, 7].includes(days)) throw new Error('不支持该延长时长')
    const result = await db.collection('tasks').doc(payload.id).get()
    const task = result.data
    if (task.publisherId !== user._id) throw new Error('只能延长自己发布的任务')
    if (task.status !== 'open') throw new Error('只有待接单任务可以延长')
    if (Number(task.extensionCount || 0) >= 2) throw new Error('每条任务最多延长两次')
    const expiresAt = new Date(new Date(task.expiresAt).getTime() + days * 86400000)
    await db.collection('tasks').doc(task._id).update({ data: { expiresAt, extensionCount: command.inc(1), updatedAt: now() } })
    return serializeTask({ ...task, expiresAt, extensionCount: Number(task.extensionCount || 0) + 1 }, user, user._id)
  },

  async acceptTask({ openid, payload }) {
    const user = await requireVerified(openid)
    const createdOrder = await db.runTransaction(async transaction => {
      const taskResult = await transaction.collection('tasks').doc(payload.id).get()
      const task = taskResult.data
      if (!task || task.status !== 'open' || new Date(task.expiresAt).getTime() <= Date.now()) throw new Error('任务已被接取或已下架')
      if (task.publisherId === user._id) throw new Error('不能接取自己发布的任务')
      if (task.school !== user.school) throw new Error('只能接取本人认证学校的任务')
      const createdAt = now()
      const order = {
        taskId: task._id,
        title: task.title,
        publisherId: task.publisherId,
        runnerId: user._id,
        amount: Number(task.amount),
        status: 'active',
        paymentStatus: 'simulated_held',
        school: task.school,
        serviceDueAt: new Date(Date.now() + Number(task.serviceHours || 24) * 3600000),
        submittedAt: null,
        autoConfirmAt: null,
        graceUntil: null,
        evidence: '',
        disputeReason: '',
        createdAt,
        updatedAt: createdAt,
        hiddenAt: null,
        events: [
          newEvent(task.publisherId, '订单创建', '发布者金额已通过开发态模拟确认'),
          newEvent(user._id, '接单成功', '任务已从公共大厅下架')
        ]
      }
      const added = await transaction.collection('orders').add({ data: order })
      await transaction.collection('tasks').doc(task._id).update({
        data: { status: 'accepted', fundsStatus: 'in_order', acceptedBy: user._id, acceptedAt: createdAt, orderId: added._id, updatedAt: createdAt }
      })
      return { id: added._id, ...order }
    })
    const inquiries = await db.collection('conversations').where({ taskId: payload.id }).limit(50).get()
    await Promise.all(inquiries.data.map(item => db.collection('conversations').doc(item._id).update({ data: { status: 'closed', updatedAt: now() } })))
    return createdOrder
  },

  async listOrders({ openid, payload }) {
    const user = await requireVerified(openid)
    const [published, accepted] = await Promise.all([
      db.collection('orders').where({ publisherId: user._id }).limit(50).get(),
      db.collection('orders').where({ runnerId: user._id }).limit(50).get()
    ])
    const map = {}
    published.data.concat(accepted.data).forEach(order => { map[order._id] = order })
    const filter = payload.filter || 'all'
    const visible = Object.values(map)
      .filter(order => !order.hiddenAt || new Date(order.hiddenAt).getTime() > Date.now() || order.status === 'disputed')
      .filter(order => filter === 'all' || (filter === 'active' && ['active', 'grace', 'submitted', 'disputed'].includes(order.status)) || (filter === 'closed' && ['completed', 'canceled'].includes(order.status)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const messageMeta = {}
    if (visible.length) {
      const messageResult = await db.collection('messages').where({ orderId: command.in(visible.map(order => order._id)) }).limit(100).get()
      messageResult.data
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach(message => {
          const meta = messageMeta[message.orderId] || { hasMessages: false, lastMessagePreview: '', lastMessageAt: null, unreadCount: 0 }
          meta.hasMessages = true
          meta.lastMessagePreview = message.content
          meta.lastMessageAt = toIso(message.createdAt)
          if (message.recipientId === user._id && !message.readAt) meta.unreadCount += 1
          messageMeta[message.orderId] = meta
        })
    }
    const users = await getUsersByIds(visible.flatMap(order => [order.publisherId, order.runnerId]))
    const orders = await Promise.all(visible.map(order => serializeOrder(order, user._id, false, users)))
    return orders.map(order => ({
      ...order,
      ...(messageMeta[order.id] || { hasMessages: false, lastMessagePreview: '', lastMessageAt: null, unreadCount: 0 })
    }))
  },

  async getOrder({ openid, payload }) {
    const user = await requireVerified(openid)
    const order = await getOrderForUser(payload.id, user._id)
    return serializeOrder(order, user._id, true)
  },

  async markOrderMessagesRead({ openid, payload }) {
    const user = await requireVerified(openid)
    const order = await getOrderForUser(payload.id, user._id)
    const result = await db.collection('messages').where({ orderId: order._id }).limit(100).get()
    const unread = result.data.filter(item => item.recipientId === user._id && !item.readAt)
    await Promise.all(unread.map(item => db.collection('messages').doc(item._id).update({ data: { readAt: now() } })))
    return { read: unread.length }
  },

  async submitOrder({ openid, payload }) {
    const user = await requireVerified(openid)
    const order = await getOrderForUser(payload.id, user._id)
    if (order.runnerId !== user._id) throw new Error('只有接单者可以提交完成')
    if (!['active', 'grace'].includes(order.status)) throw new Error('当前状态不能提交完成')
    const evidence = cleanText(payload.evidenceText, 300)
    if (!evidence) throw new Error('请填写完成说明或凭证')
    const submittedAt = now()
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'submitted',
        evidence,
        submittedAt,
        autoConfirmAt: plusMs(24 * 3600000),
        events: command.push(newEvent(user._id, '提交完成', '发布者需在24小时内确认或提出异议')),
        updatedAt: submittedAt
      }
    })
    const refreshed = await db.collection('orders').doc(order._id).get()
    return serializeOrder(refreshed.data, user._id, true)
  },

  async confirmOrder({ openid, payload }) {
    const user = await requireVerified(openid)
    const order = await getOrderForUser(payload.id, user._id)
    if (order.publisherId !== user._id) throw new Error('只有发布者可以验收')
    if (order.status !== 'submitted') throw new Error('接单者尚未提交完成')
    const completedAt = now()
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'completed',
        paymentStatus: 'simulated_settled',
        completedAt,
        hiddenAt: plusMs(7 * 86400000),
        events: command.push(newEvent(user._id, '发布者确认完成', '模拟款项已结算，订单将在7天后从用户端隐藏')),
        updatedAt: completedAt
      }
    })
    await db.collection('users').doc(order.runnerId).update({
      data: { completed: command.inc(1), walletBalance: command.inc(Number(order.amount)), updatedAt: completedAt }
    })
    const refreshed = await db.collection('orders').doc(order._id).get()
    return serializeOrder(refreshed.data, user._id, true)
  },

  async disputeOrder({ openid, payload }) {
    const user = await requireVerified(openid)
    const order = await getOrderForUser(payload.id, user._id)
    if (['completed', 'canceled'].includes(order.status)) throw new Error('该订单已关闭')
    const reason = cleanText(payload.reason, 300)
    if (!reason) throw new Error('请填写争议原因')
    const createdAt = now()
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 'disputed',
        paymentStatus: 'simulated_frozen',
        disputeReason: reason,
        events: command.push(newEvent(user._id, '发起争议', '模拟款项暂停结算，等待平台客服处理')),
        updatedAt: createdAt
      }
    })
    await db.collection('reports').add({
      data: { orderId: order._id, reporterId: user._id, reason, status: 'pending', createdAt, updatedAt: createdAt }
    })
    const refreshed = await db.collection('orders').doc(order._id).get()
    return serializeOrder(refreshed.data, user._id, true)
  },

  async addMessage({ openid, payload }) {
    const user = await requireVerified(openid)
    const order = await getOrderForUser(payload.id, user._id)
    if (['completed', 'canceled'].includes(order.status)) throw new Error('订单已关闭，不能继续发送消息')
    const content = cleanText(payload.content, 200)
    if (!content) throw new Error('消息不能为空')
    if (OFF_PLATFORM_CONTENT.test(content)) throw new Error('为保护双方权益，请勿发送联系方式或引导线下转账')
    const recipientId = user._id === order.publisherId ? order.runnerId : order.publisherId
    const message = { orderId: order._id, senderId: user._id, recipientId, content, createdAt: now() }
    const added = await db.collection('messages').add({ data: message })
    return serializeMessage({ ...message, _id: added._id }, user._id)
  },

  async ranking({ openid }) {
    const currentUser = await ensureUser(openid)
    const result = await db.collection('users').where({ verified: true }).limit(100).get()
    return result.data
      .filter(user => user.status === 'active')
      .sort((a, b) => Number(b.stars || 0) - Number(a.stars || 0) || Number(b.completed || 0) - Number(a.completed || 0))
      .map((user, index) => ({ ...publicUser(user), rank: index + 1, isMe: user._id === currentUser._id }))
  },

  async stats({ openid }) {
    const user = await ensureUser(openid)
    if (!user.verified) return { published: 0, accepted: 0, active: 0 }
    const [tasks, accepted, publishedOrders] = await Promise.all([
      db.collection('tasks').where({ publisherId: user._id }).count(),
      db.collection('orders').where({ runnerId: user._id }).count(),
      db.collection('orders').where({ publisherId: user._id }).limit(100).get()
    ])
    const acceptedOrders = await db.collection('orders').where({ runnerId: user._id }).limit(100).get()
    const allOrders = publishedOrders.data.concat(acceptedOrders.data)
    const active = new Set(allOrders.filter(order => ['active', 'grace', 'submitted', 'disputed'].includes(order.status)).map(order => order._id)).size
    return { published: tasks.total, accepted: accepted.total, active }
  }
}

exports.main = async event => {
  try {
    const context = cloud.getWXContext()
    const action = cleanText(event && event.action, 40)
    if (!context.OPENID) throw new Error('无法获取微信用户身份')
    if (!actions[action]) throw new Error(`不支持的操作：${action}`)
    const data = await actions[action]({ openid: context.OPENID, payload: event.payload || {} })
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

exports.__test__ = {
  cleanText,
  normalizeMoney,
  normalizeCategory,
  hash,
  maskPhone,
  publicUser,
  statusText,
  RISKY_CONTENT,
  OFF_PLATFORM_CONTENT
}

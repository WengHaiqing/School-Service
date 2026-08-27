const STORAGE_KEY = 'campus_dragonfly_state_v1'
const VERSION = 1
const TASK_CATEGORIES = ['校园跑腿', '跳蚤市场', '自由任务']

function iso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function normalizeCategory(value) {
  return TASK_CATEGORIES.includes(value) ? value : '自由任务'
}

function event(actorId, title, detail) {
  return { id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, actorId, title, detail, createdAt: iso() }
}

function seedState() {
  return {
    version: VERSION,
    authenticated: false,
    currentUserId: 'u_demo',
    users: [
      {
        id: 'u_demo',
        nickname: '青蜓同学',
        phone: '',
        school: '海城大学',
        campus: '东校区',
        studentNoMasked: '',
        verified: false,
        stars: 4.6,
        completed: 8,
        onTimeRate: 98,
        avatarText: '青',
        walletBalance: 200
      },
      {
        id: 'u_runner',
        nickname: '林小满',
        phone: '13800001234',
        school: '海城大学',
        campus: '东校区',
        studentNoMasked: '****2031',
        verified: true,
        stars: 4.9,
        completed: 42,
        onTimeRate: 100,
        avatarText: '林',
        walletBalance: 100
      },
      {
        id: 'u_owner',
        nickname: '周屿',
        phone: '13900005678',
        school: '海城大学',
        campus: '东校区',
        studentNoMasked: '****1186',
        verified: true,
        stars: 4.8,
        completed: 27,
        onTimeRate: 96,
        avatarText: '周',
        walletBalance: 100
      },
      {
        id: 'u_photo',
        nickname: '阿禾',
        phone: '13600009876',
        school: '海城大学',
        campus: '西校区',
        studentNoMasked: '****6720',
        verified: true,
        stars: 4.7,
        completed: 19,
        onTimeRate: 95,
        avatarText: '禾',
        walletBalance: 100
      }
    ],
    tasks: [
      {
        id: 't_express',
        publisherId: 'u_runner',
        title: '取两个快递送到图书馆北门',
        category: '校园跑腿',
        description: '快递在东区菜鸟驿站，都是普通小件。取到后送到图书馆北门，我会在门口等。',
        delivery: '送到图书馆北门并当面确认',
        location: '东区菜鸟驿站 → 图书馆北门',
        school: '海城大学',
        campus: '东校区',
        amount: 15,
        status: 'open',
        verified: true,
        expiresAt: iso(18 * 3600000),
        serviceDueAt: iso(22 * 3600000),
        extensionCount: 0,
        createdAt: iso(-2 * 3600000),
        note: '普通小件，无易碎品'
      },
      {
        id: 't_poster',
        publisherId: 'u_owner',
        title: '社团招新海报文字排版',
        category: '自由任务',
        description: '已有海报底图和全部文案，需要帮忙调整字号、层级和间距，交付可编辑文件及导出图片。',
        delivery: '交付一份可编辑源文件和一张高清 PNG',
        location: '线上交付',
        school: '海城大学',
        campus: '东校区',
        amount: 48,
        status: 'open',
        verified: true,
        expiresAt: iso(2 * 86400000),
        serviceDueAt: iso(4 * 86400000),
        extensionCount: 0,
        createdAt: iso(-5 * 3600000),
        note: '不是作业或课程项目'
      },
      {
        id: 't_photo',
        publisherId: 'u_photo',
        title: '毕业活动现场拍摄一小时',
        category: '自由任务',
        description: '学院毕业活动需要记录现场，手机或相机均可，重点拍合影和互动环节。',
        delivery: '活动结束后当天上传原图',
        location: '西校区大学生活动中心',
        school: '海城大学',
        campus: '西校区',
        amount: 80,
        status: 'open',
        verified: true,
        expiresAt: iso(6 * 86400000),
        serviceDueAt: iso(7 * 86400000),
        extensionCount: 0,
        createdAt: iso(-9 * 3600000),
        note: '活动时间周六 14:00—15:00'
      },
      {
        id: 't_demo_own',
        publisherId: 'u_demo',
        title: '帮忙调试宿舍打印机连接',
        category: '自由任务',
        description: '打印机能够正常开机，但电脑搜索不到设备，希望熟悉打印机设置的同学帮忙看一下。',
        delivery: '电脑能够正常打印测试页',
        location: '东校区 3 号宿舍楼大厅',
        school: '海城大学',
        campus: '东校区',
        amount: 25,
        status: 'open',
        verified: true,
        expiresAt: iso(30 * 3600000),
        serviceDueAt: iso(3 * 86400000),
        extensionCount: 0,
        createdAt: iso(-12 * 3600000),
        note: '只在宿舍楼大厅操作'
      }
    ],
    orders: [
      {
        id: 'o_wait_acceptance',
        taskId: 't_seed_done',
        title: '活动签到表整理',
        publisherId: 'u_demo',
        runnerId: 'u_runner',
        amount: 32,
        status: 'submitted',
        paymentStatus: 'simulated_held',
        school: '海城大学',
        serviceDueAt: iso(12 * 3600000),
        submittedAt: iso(-2 * 3600000),
        autoConfirmAt: iso(22 * 3600000),
        evidence: '已按姓名拼音排序，共整理 86 条，并上传整理后的表格。',
        createdAt: iso(-86400000),
        hiddenAt: null,
        events: [
          event('u_demo', '订单创建', '发布者已确认固定金额'),
          event('u_runner', '接单成功', '接单者开始处理任务'),
          event('u_runner', '提交完成', '等待发布者验收')
        ],
        messages: [
          { id: 'm_1', senderId: 'u_demo', content: '请按姓名拼音排序，重复的标成黄色。', createdAt: iso(-22 * 3600000) },
          { id: 'm_2', senderId: 'u_runner', content: '收到，我会保留一份原表。', createdAt: iso(-21 * 3600000) }
        ]
      },
      {
        id: 'o_need_submit',
        taskId: 't_seed_active',
        title: '图书馆资料送到学院楼',
        publisherId: 'u_owner',
        runnerId: 'u_demo',
        amount: 18,
        status: 'active',
        paymentStatus: 'simulated_held',
        school: '海城大学',
        serviceDueAt: iso(8 * 3600000),
        submittedAt: null,
        autoConfirmAt: null,
        evidence: '',
        createdAt: iso(-3 * 3600000),
        hiddenAt: null,
        events: [
          event('u_owner', '订单创建', '发布者已确认固定金额'),
          event('u_demo', '接单成功', '请在截止时间前提交完成凭证')
        ],
        messages: [
          { id: 'm_3', senderId: 'u_owner', content: '资料袋上写着新闻学院，放一楼值班室即可。', createdAt: iso(-2 * 3600000) }
        ]
      }
    ],
    conversations: [],
    reports: []
  }
}

function read() {
  const data = wx.getStorageSync(STORAGE_KEY)
  if (!data || data.version !== VERSION) {
    const initial = seedState()
    wx.setStorageSync(STORAGE_KEY, initial)
    return initial
  }
  if (!Array.isArray(data.conversations)) {
    data.conversations = []
    wx.setStorageSync(STORAGE_KEY, data)
  }
  return data
}

function write(state) {
  wx.setStorageSync(STORAGE_KEY, state)
  return state
}

function initialize() {
  read()
}

function reset() {
  const initial = seedState()
  write(initial)
  return clone(initial)
}

function getUser(state, id) {
  return state.users.find(item => item.id === id)
}

function getCurrentUser() {
  const state = read()
  return clone(getUser(state, state.currentUserId))
}

function session() {
  const state = read()
  return {
    authenticated: state.authenticated,
    user: clone(getUser(state, state.currentUserId))
  }
}

function completeOnboarding(payload) {
  const state = read()
  const user = getUser(state, state.currentUserId)
  user.phone = payload.phone
  user.school = payload.school.trim()
  user.campus = payload.campus.trim() || '主校区'
  user.studentNoMasked = `****${payload.studentNo.slice(-4)}`
  user.verified = true
  state.authenticated = true
  write(state)
  return clone(user)
}

function rechargeWallet(amount) {
  const state = read()
  const user = requireAuth(state)
  const value = normalizeMoney(amount)
  if (!Number.isFinite(value) || value <= 0 || value > 5000) throw new Error('充值金额必须在0至5000元之间')
  user.walletBalance = normalizeMoney((user.walletBalance || 0) + value)
  write(state)
  return clone(user)
}

function withdrawWallet(amount) {
  const state = read()
  const user = requireAuth(state)
  const value = normalizeMoney(amount)
  if (!Number.isFinite(value) || value <= 0 || value > 5000) throw new Error('提现金额必须在0至5000元之间')
  if (normalizeMoney(user.walletBalance) < value) throw new Error('钱包余额不足')
  user.walletBalance = normalizeMoney(user.walletBalance - value)
  write(state)
  return clone(user)
}

function sweep() {
  const state = read()
  const now = Date.now()
  let changed = false

  state.tasks.forEach(task => {
    if (task.status === 'open' && new Date(task.expiresAt).getTime() <= now) {
      task.status = 'expired'
      if (task.fundsStatus === 'held') {
        const publisher = getUser(state, task.publisherId)
        if (publisher) publisher.walletBalance = normalizeMoney((publisher.walletBalance || 0) + Number(task.amount))
        task.fundsStatus = 'refunded'
      }
      changed = true
    }
  })

  state.orders.forEach(order => {
    if (order.status === 'submitted' && order.autoConfirmAt && new Date(order.autoConfirmAt).getTime() <= now) {
      order.status = 'completed'
      order.paymentStatus = 'simulated_settled'
      const runner = getUser(state, order.runnerId)
      if (runner) runner.walletBalance = normalizeMoney((runner.walletBalance || 0) + Number(order.amount))
      order.completedAt = iso()
      order.hiddenAt = iso(7 * 86400000)
      order.events.push(event('system', '系统自动验收', '发布者在24小时内未提出异议'))
      changed = true
    } else if (order.status === 'active' && new Date(order.serviceDueAt).getTime() <= now) {
      order.status = 'grace'
      order.graceUntil = iso(24 * 3600000)
      order.events.push(event('system', '订单顺延24小时', '接单者未在履约截止时间前提交完成凭证'))
      changed = true
    } else if (order.status === 'grace' && new Date(order.graceUntil).getTime() <= now) {
      order.status = 'canceled'
      order.paymentStatus = 'simulated_refunded'
      const publisher = getUser(state, order.publisherId)
      if (publisher) publisher.walletBalance = normalizeMoney((publisher.walletBalance || 0) + Number(order.amount))
      order.hiddenAt = iso(7 * 86400000)
      order.events.push(event('system', '订单自动取消', '顺延期结束后仍未提交，模拟款项原路退回'))
      changed = true
    }
  })

  if (changed) write(state)
  return changed
}

function decorateTask(state, task) {
  const publisher = getUser(state, task.publisherId)
  return {
    ...clone(task),
    category: normalizeCategory(task.category),
    publisher: publisher ? clone(publisher) : null,
    isMine: task.publisherId === state.currentUserId
  }
}

function listTasks(filters = {}) {
  sweep()
  const state = read()
  const keyword = (filters.keyword || '').trim().toLowerCase()
  return state.tasks
    .filter(task => task.status === 'open')
    .filter(task => !filters.category || filters.category === '全部' || normalizeCategory(task.category) === filters.category)
    .filter(task => !filters.campus || filters.campus === '全部校区' || task.campus === filters.campus)
    .filter(task => !filters.school || task.school === filters.school)
    .filter(task => !keyword || `${task.title}${task.category}${task.location}${task.description}`.toLowerCase().includes(keyword))
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    .map(task => decorateTask(state, task))
}

function getTask(id) {
  sweep()
  const state = read()
  const task = state.tasks.find(item => item.id === id)
  return task && task.status === 'open' ? decorateTask(state, task) : null
}

function decorateInquiry(state, conversation) {
  const isPublisher = conversation.publisherId === state.currentUserId
  const peerId = isPublisher ? conversation.inquirerId : conversation.publisherId
  const messages = clone(conversation.messages || [])
  return {
    ...clone(conversation),
    type: 'inquiry',
    statusText: conversation.status === 'closed' ? '咨询已结束' : '任务咨询',
    canSend: conversation.status !== 'closed',
    hasMessages: messages.length > 0,
    unreadCount: messages.filter(item => item.recipientId === state.currentUserId && !item.readAt).length,
    lastMessagePreview: messages.length ? messages[messages.length - 1].content : '',
    lastMessageAt: messages.length ? messages[messages.length - 1].createdAt : conversation.createdAt,
    role: isPublisher ? 'publisher' : 'inquirer',
    peer: clone(getUser(state, peerId)),
    publisher: clone(getUser(state, conversation.publisherId)),
    inquirer: clone(getUser(state, conversation.inquirerId)),
    messages
  }
}

function openTaskInquiry(taskId) {
  const state = read()
  const user = requireAuth(state)
  const task = state.tasks.find(item => item.id === taskId)
  if (!task || task.status !== 'open') throw new Error('任务已下架，暂时不能咨询')
  if (task.publisherId === user.id) throw new Error('不能咨询自己发布的任务')
  if (task.school !== user.school) throw new Error('只能咨询本人认证学校的任务')
  let conversation = state.conversations.find(item => item.taskId === taskId && item.inquirerId === user.id)
  if (!conversation) {
    conversation = {
      id: `inquiry_${taskId}_${user.id}`,
      taskId,
      title: task.title,
      amount: task.amount,
      publisherId: task.publisherId,
      inquirerId: user.id,
      status: 'open',
      createdAt: iso(),
      messages: []
    }
    state.conversations.unshift(conversation)
    write(state)
  }
  return decorateInquiry(state, conversation)
}

function listTaskInquiries() {
  const state = read()
  requireAuth(state)
  return state.conversations
    .filter(item => item.publisherId === state.currentUserId || item.inquirerId === state.currentUserId)
    .sort((a, b) => new Date((b.messages && b.messages.length ? b.messages[b.messages.length - 1].createdAt : b.createdAt)) - new Date((a.messages && a.messages.length ? a.messages[a.messages.length - 1].createdAt : a.createdAt)))
    .map(item => decorateInquiry(state, item))
}

function getTaskInquiry(id) {
  const state = read()
  requireAuth(state)
  const conversation = state.conversations.find(item => item.id === id)
  if (!conversation) return null
  if (conversation.publisherId !== state.currentUserId && conversation.inquirerId !== state.currentUserId) return null
  return decorateInquiry(state, conversation)
}

function addTaskInquiryMessage(id, content) {
  const state = read()
  requireAuth(state)
  const conversation = state.conversations.find(item => item.id === id)
  if (!conversation) throw new Error('咨询不存在')
  if (conversation.publisherId !== state.currentUserId && conversation.inquirerId !== state.currentUserId) throw new Error('无权操作该咨询')
  const task = state.tasks.find(item => item.id === conversation.taskId)
  if (conversation.status === 'closed' || !task || task.status !== 'open') throw new Error('该任务咨询已结束')
  const value = (content || '').trim()
  if (!value) throw new Error('消息不能为空')
  const risky = /(1\d{10})|(微信|vx|v信|加我|二维码|支付宝|线下转账)/i.test(value)
  if (risky) throw new Error('为保护双方权益，请勿发送联系方式或引导线下转账')
  const recipientId = state.currentUserId === conversation.publisherId ? conversation.inquirerId : conversation.publisherId
  conversation.messages.push({ id: `im_${Date.now()}`, senderId: state.currentUserId, recipientId, content: value, createdAt: iso() })
  write(state)
  return decorateInquiry(state, conversation)
}

function markTaskInquiryRead(id) {
  const state = read()
  const conversation = state.conversations.find(item => item.id === id)
  if (!conversation) return { read: 0 }
  let count = 0
  ;(conversation.messages || []).forEach(item => {
    if (item.recipientId === state.currentUserId && !item.readAt) {
      item.readAt = iso()
      count += 1
    }
  })
  if (count) write(state)
  return { read: count }
}

function requireAuth(state) {
  if (!state.authenticated) throw new Error('请先完成微信、手机和校园身份认证')
  const user = getUser(state, state.currentUserId)
  if (!user || !user.verified) throw new Error('请先完成校园身份认证')
  return user
}

function createTask(payload) {
  const state = read()
  const user = requireAuth(state)
  const amount = normalizeMoney(payload.amount)
  const title = String(payload.title || '').trim().slice(0, 20)
  const note = String(payload.note || '').trim().slice(0, 50)
  const expiryHours = Number(payload.expiryHours)
  if (title.length < 2) throw new Error('任务标题至少2个字')
  if (!TASK_CATEGORIES.includes(payload.category)) throw new Error('不支持该任务分类')
  if (![24, 72, 168, 336].includes(expiryHours)) throw new Error('任务时效参数无效')
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) throw new Error('任务金额必须在0至2000元之间')
  if (normalizeMoney(user.walletBalance) < amount) throw new Error('钱包余额不足，请先充值')
  user.walletBalance = normalizeMoney(user.walletBalance - amount)
  const createdAt = iso()
  const task = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    publisherId: user.id,
    title,
    category: payload.category,
    description: note || title,
    delivery: '按任务标题和备注约定完成',
    location: `${user.campus}内`,
    school: user.school,
    campus: user.campus,
    amount,
    status: 'open',
    verified: true,
    expiresAt: iso(expiryHours * 3600000),
    serviceDueAt: iso(24 * 3600000),
    serviceHours: 24,
    extensionCount: 0,
    createdAt,
    note,
    fundsStatus: 'held'
  }
  state.tasks.unshift(task)
  write(state)
  return clone(task)
}

function extendTask(id, days) {
  const state = read()
  requireAuth(state)
  const task = state.tasks.find(item => item.id === id)
  if (!task) throw new Error('任务不存在')
  if (task.publisherId !== state.currentUserId) throw new Error('只能延长自己发布的任务')
  if (task.status !== 'open') throw new Error('只有待接单任务可以延长')
  if (task.extensionCount >= 2) throw new Error('每条任务最多延长两次')
  task.expiresAt = new Date(new Date(task.expiresAt).getTime() + days * 86400000).toISOString()
  task.extensionCount += 1
  write(state)
  return decorateTask(state, task)
}

function acceptTask(id) {
  const state = read()
  const user = requireAuth(state)
  const task = state.tasks.find(item => item.id === id)
  if (!task || task.status !== 'open') throw new Error('任务已被接取或已下架')
  if (task.publisherId === user.id) throw new Error('不能接取自己发布的任务')
  if (task.school !== user.school) throw new Error('只能接取本人认证学校的任务')
  task.status = 'accepted'
  const order = {
    id: `o_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    taskId: task.id,
    title: task.title,
    publisherId: task.publisherId,
    runnerId: user.id,
    amount: task.amount,
    status: 'active',
    paymentStatus: 'simulated_held',
    school: task.school,
    serviceDueAt: task.serviceDueAt,
    submittedAt: null,
    autoConfirmAt: null,
    evidence: '',
    createdAt: iso(),
    hiddenAt: null,
    events: [
      event(task.publisherId, '订单创建', '发布者金额已通过开发态模拟确认'),
      event(user.id, '接单成功', '任务已从公共大厅下架')
    ],
    messages: []
  }
  state.orders.unshift(order)
  state.conversations.filter(item => item.taskId === task.id).forEach(item => { item.status = 'closed' })
  write(state)
  return clone(order)
}

function decorateOrder(state, order) {
  const statusMap = {
    active: '进行中',
    grace: '顺延中',
    submitted: '待验收',
    disputed: '争议处理中',
    completed: '已完成',
    canceled: '已取消'
  }
  const messages = clone(order.messages || [])
  return {
    ...clone(order),
    statusText: statusMap[order.status] || order.status,
    publisher: clone(getUser(state, order.publisherId)),
    runner: clone(getUser(state, order.runnerId)),
    role: order.publisherId === state.currentUserId ? 'publisher' : 'runner',
    messages,
    hasMessages: messages.length > 0,
    unreadCount: messages.filter(item => item.recipientId === state.currentUserId && !item.readAt).length,
    lastMessagePreview: messages.length ? messages[messages.length - 1].content : '',
    lastMessageAt: messages.length ? messages[messages.length - 1].createdAt : null
  }
}

function listOrders(filter = 'all') {
  sweep()
  const state = read()
  const now = Date.now()
  return state.orders
    .filter(order => order.publisherId === state.currentUserId || order.runnerId === state.currentUserId)
    .filter(order => !order.hiddenAt || new Date(order.hiddenAt).getTime() > now || order.status === 'disputed')
    .filter(order => filter === 'all' || (filter === 'active' && ['active', 'grace', 'submitted', 'disputed'].includes(order.status)) || (filter === 'closed' && ['completed', 'canceled'].includes(order.status)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(order => decorateOrder(state, order))
}

function getOrder(id) {
  sweep()
  const state = read()
  const order = state.orders.find(item => item.id === id)
  if (!order) return null
  if (order.publisherId !== state.currentUserId && order.runnerId !== state.currentUserId) return null
  return decorateOrder(state, order)
}

function submitOrder(id, evidenceText) {
  const state = read()
  requireAuth(state)
  const order = state.orders.find(item => item.id === id)
  if (!order) throw new Error('订单不存在')
  if (order.runnerId !== state.currentUserId) throw new Error('只有接单者可以提交完成')
  if (!['active', 'grace'].includes(order.status)) throw new Error('当前状态不能提交完成')
  if (!evidenceText || !evidenceText.trim()) throw new Error('请填写完成说明或凭证')
  order.status = 'submitted'
  order.evidence = evidenceText.trim()
  order.submittedAt = iso()
  order.autoConfirmAt = iso(24 * 3600000)
  order.events.push(event(state.currentUserId, '提交完成', '发布者需在24小时内确认或提出异议'))
  write(state)
  return decorateOrder(state, order)
}

function confirmOrder(id) {
  const state = read()
  requireAuth(state)
  const order = state.orders.find(item => item.id === id)
  if (!order) throw new Error('订单不存在')
  if (order.publisherId !== state.currentUserId) throw new Error('只有发布者可以验收')
  if (order.status !== 'submitted') throw new Error('接单者尚未提交完成')
  order.status = 'completed'
  order.completedAt = iso()
  order.hiddenAt = iso(7 * 86400000)
  order.paymentStatus = 'simulated_settled'
  order.events.push(event(state.currentUserId, '发布者确认完成', '模拟款项已结算，订单将在7天后从用户端隐藏'))
  const runner = getUser(state, order.runnerId)
  if (runner) {
    runner.walletBalance = normalizeMoney((runner.walletBalance || 0) + Number(order.amount))
    runner.completed += 1
    runner.stars = Math.min(5, Number((runner.stars + 0.02).toFixed(2)))
  }
  write(state)
  return decorateOrder(state, order)
}

function disputeOrder(id, reason) {
  const state = read()
  requireAuth(state)
  const order = state.orders.find(item => item.id === id)
  if (!order) throw new Error('订单不存在')
  if (order.publisherId !== state.currentUserId && order.runnerId !== state.currentUserId) throw new Error('无权操作该订单')
  if (['completed', 'canceled'].includes(order.status)) throw new Error('该订单已关闭')
  if (!reason || !reason.trim()) throw new Error('请填写争议原因')
  order.status = 'disputed'
  order.paymentStatus = 'simulated_frozen'
  order.disputeReason = reason.trim()
  order.events.push(event(state.currentUserId, '发起争议', '模拟款项暂停结算，等待平台客服处理'))
  state.reports.unshift({ id: `r_${Date.now()}`, orderId: id, reporterId: state.currentUserId, reason: reason.trim(), status: 'pending', createdAt: iso() })
  write(state)
  return decorateOrder(state, order)
}

function addMessage(id, content) {
  const state = read()
  requireAuth(state)
  const order = state.orders.find(item => item.id === id)
  if (!order) throw new Error('订单不存在')
  if (order.publisherId !== state.currentUserId && order.runnerId !== state.currentUserId) throw new Error('无权操作该订单')
  const value = (content || '').trim()
  if (!value) throw new Error('消息不能为空')
  const risky = /(1\d{10})|(微信|vx|v信|加我|二维码|支付宝|线下转账)/i.test(value)
  if (risky) throw new Error('为保护双方权益，请勿发送联系方式或引导线下转账')
  const recipientId = state.currentUserId === order.publisherId ? order.runnerId : order.publisherId
  order.messages.push({ id: `m_${Date.now()}`, senderId: state.currentUserId, recipientId, content: value, createdAt: iso() })
  write(state)
  return decorateOrder(state, order)
}

function markOrderMessagesRead(id) {
  const state = read()
  const order = state.orders.find(item => item.id === id)
  if (!order) return { read: 0 }
  let count = 0
  ;(order.messages || []).forEach(item => {
    if (item.recipientId === state.currentUserId && !item.readAt) {
      item.readAt = iso()
      count += 1
    }
  })
  if (count) write(state)
  return { read: count }
}

function ranking() {
  const state = read()
  return clone(state.users)
    .filter(user => user.verified)
    .sort((a, b) => b.stars - a.stars || b.completed - a.completed)
    .map((user, index) => ({ ...user, rank: index + 1, isMe: user.id === state.currentUserId }))
}

function stats() {
  const state = read()
  const userId = state.currentUserId
  const published = state.tasks.filter(task => task.publisherId === userId).length + state.orders.filter(order => order.publisherId === userId && !state.tasks.some(task => task.id === order.taskId)).length
  const accepted = state.orders.filter(order => order.runnerId === userId).length
  const active = state.orders.filter(order => (order.publisherId === userId || order.runnerId === userId) && ['active', 'grace', 'submitted', 'disputed'].includes(order.status)).length
  return { published, accepted, active }
}

module.exports = {
  initialize,
  reset,
  session,
  completeOnboarding,
  rechargeWallet,
  withdrawWallet,
  sweep,
  listTasks,
  getTask,
  openTaskInquiry,
  listTaskInquiries,
  getTaskInquiry,
  addTaskInquiryMessage,
  markTaskInquiryRead,
  createTask,
  extendTask,
  acceptTask,
  listOrders,
  getOrder,
  submitOrder,
  confirmOrder,
  disputeOrder,
  addMessage,
  markOrderMessagesRead,
  ranking,
  stats,
  getCurrentUser
}

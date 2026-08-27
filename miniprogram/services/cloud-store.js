const FUNCTION_NAME = 'campusApi'
const SESSION_CACHE_MS = 30000
let bootstrapPromise = null
let sessionPromise = null
let sessionCache = null

function cacheSession(value) {
  if (!value || !value.user) return value
  sessionCache = {
    value,
    expiresAt: Date.now() + SESSION_CACHE_MS
  }
  return value
}

function cacheSessionUser(user) {
  return cacheSession({ authenticated: Boolean(user && user.verified), user })
}

async function call(action, payload = {}) {
  if (!wx.cloud) throw new Error('当前微信基础库不支持云开发')
  let response
  try {
    response = await wx.cloud.callFunction({
      name: FUNCTION_NAME,
      data: { action, payload }
    })
  } catch (error) {
    const message = error && error.errMsg ? error.errMsg : '云函数调用失败'
    if (/not found|FUNCTION_NOT_FOUND|没有找到/i.test(message)) {
      throw new Error('云函数尚未部署，请在开发者工具中上传并部署 campusApi')
    }
    throw new Error(message)
  }

  const result = response && response.result
  if (!result || result.ok !== true) {
    const message = (result && result.error) || '云端服务返回异常'
    if (/不支持的操作/.test(message)) {
      throw new Error('云函数版本过旧，请重新部署 campusApi 后再试')
    }
    throw new Error(message)
  }
  return result.data
}

function initialize() {
  if (!bootstrapPromise) {
    bootstrapPromise = call('bootstrap')
      .then(data => {
        if (data && data.user) cacheSessionUser(data.user)
        return data
      })
      .catch(error => {
        bootstrapPromise = null
        throw error
      })
  }
  return bootstrapPromise
}

async function guardedCall(action, payload) {
  await initialize()
  return call(action, payload)
}

async function session() {
  await initialize()
  if (sessionCache && sessionCache.expiresAt > Date.now()) return sessionCache.value
  if (!sessionPromise) {
    sessionPromise = call('session')
      .then(cacheSession)
      .finally(() => { sessionPromise = null })
  }
  return sessionPromise
}

async function completeOnboarding(payload) {
  const user = await guardedCall('completeOnboarding', payload)
  cacheSessionUser(user)
  return user
}

async function updateWallet(action, amount) {
  const user = await guardedCall(action, { amount })
  cacheSessionUser(user)
  return user
}

async function createTask(payload) {
  const task = await guardedCall('createTask', payload)
  if (sessionCache && sessionCache.value && sessionCache.value.user) {
    const user = sessionCache.value.user
    cacheSession({
      ...sessionCache.value,
      user: { ...user, walletBalance: Math.max(0, Number(user.walletBalance || 0) - Number(payload.amount || 0)) }
    })
  }
  return task
}

async function confirmOrder(id) {
  const order = await guardedCall('confirmOrder', { id })
  sessionCache = null
  return order
}

module.exports = {
  initialize,
  reset: () => Promise.reject(new Error('云端模式不支持一键清空全部用户数据')),
  session,
  completeOnboarding,
  rechargeWallet: amount => updateWallet('rechargeWallet', amount),
  withdrawWallet: amount => updateWallet('withdrawWallet', amount),
  sweep: () => guardedCall('sweep'),
  listTasks: filters => guardedCall('listTasks', filters || {}),
  getTask: id => guardedCall('getTask', { id }),
  openTaskInquiry: id => guardedCall('openTaskInquiry', { id }),
  listTaskInquiries: () => guardedCall('listTaskInquiries'),
  getTaskInquiry: id => guardedCall('getTaskInquiry', { id }),
  addTaskInquiryMessage: (id, content) => guardedCall('addTaskInquiryMessage', { id, content }),
  markTaskInquiryRead: id => guardedCall('markTaskInquiryRead', { id }),
  createTask,
  extendTask: (id, days) => guardedCall('extendTask', { id, days }),
  acceptTask: id => guardedCall('acceptTask', { id }),
  listOrders: filter => guardedCall('listOrders', { filter: filter || 'all' }),
  getOrder: id => guardedCall('getOrder', { id }),
  submitOrder: (id, evidenceText) => guardedCall('submitOrder', { id, evidenceText }),
  confirmOrder,
  disputeOrder: (id, reason) => guardedCall('disputeOrder', { id, reason }),
  addMessage: (id, content) => guardedCall('addMessage', { id, content }),
  markOrderMessagesRead: id => guardedCall('markOrderMessagesRead', { id }),
  ranking: () => guardedCall('ranking'),
  stats: () => guardedCall('stats'),
  getCurrentUser: async () => (await session()).user
}

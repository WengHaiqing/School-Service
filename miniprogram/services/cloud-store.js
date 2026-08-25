const FUNCTION_NAME = 'campusApi'
let bootstrapPromise = null

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
    throw new Error((result && result.error) || '云端服务返回异常')
  }
  return result.data
}

function initialize() {
  if (!bootstrapPromise) {
    bootstrapPromise = call('bootstrap').catch(error => {
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

module.exports = {
  initialize,
  reset: () => Promise.reject(new Error('云端模式不支持一键清空全部用户数据')),
  session: () => guardedCall('session'),
  completeOnboarding: payload => guardedCall('completeOnboarding', payload),
  sweep: () => guardedCall('sweep'),
  listTasks: filters => guardedCall('listTasks', filters || {}),
  getTask: id => guardedCall('getTask', { id }),
  createTask: payload => guardedCall('createTask', payload),
  extendTask: (id, days) => guardedCall('extendTask', { id, days }),
  acceptTask: id => guardedCall('acceptTask', { id }),
  listOrders: filter => guardedCall('listOrders', { filter: filter || 'all' }),
  getOrder: id => guardedCall('getOrder', { id }),
  submitOrder: (id, evidenceText) => guardedCall('submitOrder', { id, evidenceText }),
  confirmOrder: id => guardedCall('confirmOrder', { id }),
  disputeOrder: (id, reason) => guardedCall('disputeOrder', { id, reason }),
  addMessage: (id, content) => guardedCall('addMessage', { id, content }),
  ranking: () => guardedCall('ranking'),
  stats: () => guardedCall('stats'),
  getCurrentUser: async () => (await guardedCall('session')).user
}

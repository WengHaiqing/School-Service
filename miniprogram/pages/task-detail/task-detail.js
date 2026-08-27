const dataService = require('../../services/data-service')
const { formatDateTime, relativeDeadline } = require('../../utils/format')

function formatTask(raw) {
  if (!raw) return null
  return {
    ...raw,
    expiresText: formatDateTime(raw.expiresAt),
    deadlineText: relativeDeadline(raw.expiresAt),
    serviceText: formatDateTime(raw.serviceDueAt),
    createdText: formatDateTime(raw.createdAt)
  }
}

Page({
  data: {
    id: '',
    task: null,
    authenticated: false,
    accepting: false,
    contacting: false,
    loading: true
  },

  onLoad(options) {
    const id = options.id || ''
    const app = getApp()
    const prefetchedTask = app && app.globalData.prefetchedTask
    const cachedSession = app && app.globalData.session
    this.setData({
      id,
      task: prefetchedTask && prefetchedTask.id === id ? formatTask(prefetchedTask) : null,
      authenticated: Boolean(cachedSession && cachedSession.authenticated)
    })
  },

  onShow() {
    this.load({ silent: Boolean(this.data.task) })
  },

  async load(options) {
    const silent = options && options.silent
    if (!silent) this.setData({ loading: true })
    try {
      const results = await Promise.all([
        dataService.session(),
        dataService.getTask(this.data.id)
      ])
      const session = results[0]
      const raw = results[1]
      if (!raw) {
        this.setData({ task: null, authenticated: session.authenticated, loading: false })
        return
      }
      this.setData({
        authenticated: session.authenticated,
        task: formatTask(raw),
        loading: false
      })
      const app = getApp()
      if (app) {
        app.globalData.session = session
        app.globalData.prefetchedTask = raw
      }
      wx.setNavigationBarTitle({ title: raw.category })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
      this.setData({ loading: false })
    }
  },

  accept() {
    if (!this.data.authenticated) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const task = this.data.task
    if (!task || task.isMine) return
    wx.showModal({
      title: `确认接单 ¥${task.amount}`,
      content: `接单后任务会从首页下架。请在 ${task.serviceText} 前完成，并在订单内提交凭证。金额由开发态测试钱包暂存。`,
      confirmText: '确认接单',
      success: async result => {
        if (!result.confirm) return
        this.setData({ accepting: true })
        try {
          const order = await dataService.acceptTask(task.id)
          wx.showToast({ title: '接单成功', icon: 'success' })
          wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${order.id}` })
        } catch (error) {
          wx.showToast({ title: error.message, icon: 'none' })
          this.load()
        } finally {
          this.setData({ accepting: false })
        }
      }
    })
  },

  contactPublisher() {
    if (!this.data.authenticated) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const task = this.data.task
    if (!task || task.isMine || this.data.contacting) return
    wx.navigateTo({ url: `/pages/chat/chat?mode=inquiry&taskId=${task.id}` })
  },

  async extend(event) {
    const days = Number(event.currentTarget.dataset.days)
    try {
      const task = await dataService.extendTask(this.data.id, days)
      wx.showToast({ title: `已延长${days}天`, icon: 'success' })
      this.setData({ task: formatTask(task) })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  openRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  goSearch() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})

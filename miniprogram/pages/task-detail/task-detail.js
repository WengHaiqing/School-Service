const store = require('../../services/store')
const { formatDateTime, relativeDeadline } = require('../../utils/format')

Page({
  data: {
    id: '',
    task: null,
    authenticated: false,
    accepting: false
  },

  onLoad(options) {
    this.setData({ id: options.id || '' })
  },

  onShow() {
    this.load()
  },

  load() {
    const session = store.session()
    const raw = store.getTask(this.data.id)
    if (!raw) {
      this.setData({ task: null, authenticated: session.authenticated })
      return
    }
    this.setData({
      authenticated: session.authenticated,
      task: {
        ...raw,
        expiresText: formatDateTime(raw.expiresAt),
        deadlineText: relativeDeadline(raw.expiresAt),
        serviceText: formatDateTime(raw.serviceDueAt),
        createdText: formatDateTime(raw.createdAt)
      }
    })
    wx.setNavigationBarTitle({ title: raw.category })
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
      content: `接单后任务会从大厅下架。请在 ${task.serviceText} 前完成，并在订单内提交凭证。当前金额为开发态模拟托管。`,
      confirmText: '确认接单',
      success: result => {
        if (!result.confirm) return
        this.setData({ accepting: true })
        try {
          const order = store.acceptTask(task.id)
          wx.showToast({ title: '接单成功', icon: 'success' })
          setTimeout(() => wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${order.id}` }), 500)
        } catch (error) {
          wx.showToast({ title: error.message, icon: 'none' })
          this.load()
        } finally {
          this.setData({ accepting: false })
        }
      }
    })
  },

  extend(event) {
    const days = Number(event.currentTarget.dataset.days)
    try {
      const task = store.extendTask(this.data.id, days)
      wx.showToast({ title: `已延长${days}天`, icon: 'success' })
      this.setData({ task: { ...task, expiresText: formatDateTime(task.expiresAt), deadlineText: relativeDeadline(task.expiresAt), serviceText: formatDateTime(task.serviceDueAt), createdText: formatDateTime(task.createdAt) } })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  openRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  goSearch() {
    wx.switchTab({ url: '/pages/search/search' })
  }
})

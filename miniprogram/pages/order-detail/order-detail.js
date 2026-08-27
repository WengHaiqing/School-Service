const dataService = require('../../services/data-service')
const { formatDateTime } = require('../../utils/format')

function formatOrder(raw) {
  if (!raw) return null
  return {
    ...raw,
    roleText: raw.role === 'publisher' ? '发布者' : '接单者',
    peer: raw.role === 'publisher' ? raw.runner : raw.publisher,
    createdText: formatDateTime(raw.createdAt),
    dueText: formatDateTime(raw.serviceDueAt),
    submittedText: formatDateTime(raw.submittedAt),
    autoConfirmText: formatDateTime(raw.autoConfirmAt),
    hiddenText: formatDateTime(raw.hiddenAt),
    events: (raw.events || []).slice().reverse().map(item => ({ ...item, timeText: formatDateTime(item.createdAt) }))
  }
}

Page({
  data: {
    id: '',
    order: null,
    currentUserId: '',
    evidence: '',
    disputeReason: '',
    showDispute: false,
    loading: true
  },

  onLoad(options) {
    const id = options.id || ''
    const app = getApp()
    const cached = app && app.globalData.prefetchedOrder
    this.setData({
      id,
      order: cached && cached.id === id && cached.publisher && cached.runner ? formatOrder(cached) : null
    })
  },

  onShow() {
    this.load({ silent: Boolean(this.data.order) })
  },

  async load(options) {
    const silent = options && options.silent
    if (!silent) this.setData({ loading: true })
    try {
      const results = await Promise.all([
        dataService.session(),
        dataService.getOrder(this.data.id)
      ])
      const session = results[0]
      const raw = results[1]
      if (!raw) {
        this.setData({ order: null, currentUserId: session.user ? session.user.id : '', loading: false })
        return
      }
      const order = formatOrder(raw)
      this.setData({ order, currentUserId: session.user.id, loading: false })
      const app = getApp()
      if (app) {
        app.globalData.session = session
        app.globalData.prefetchedOrder = raw
      }
      wx.setNavigationBarTitle({ title: raw.statusText })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
      this.setData({ loading: false })
    }
  },

  onInput(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  async submitComplete() {
    try {
      await dataService.submitOrder(this.data.id, this.data.evidence)
      this.setData({ evidence: '' })
      wx.showToast({ title: '已提交完成', icon: 'success' })
      this.load()
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  confirmComplete() {
    wx.showModal({
      title: '确认任务已经完成？',
      content: '确认后模拟款项将结算给接单者，订单保留7天用户可见期后隐藏。',
      confirmText: '确认完成',
      success: async result => {
        if (!result.confirm) return
        try {
          await dataService.confirmOrder(this.data.id)
          wx.showToast({ title: '订单已完成', icon: 'success' })
          this.load()
        } catch (error) {
          wx.showToast({ title: error.message, icon: 'none' })
        }
      }
    })
  },

  toggleDispute() {
    this.setData({ showDispute: !this.data.showDispute })
  },

  async submitDispute() {
    try {
      await dataService.disputeOrder(this.data.id, this.data.disputeReason)
      this.setData({ disputeReason: '', showDispute: false })
      wx.showToast({ title: '已提交客服', icon: 'success' })
      this.load()
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  goChat() {
    wx.navigateTo({ url: `/pages/chat/chat?id=${this.data.id}` })
  },

  backOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  }
})

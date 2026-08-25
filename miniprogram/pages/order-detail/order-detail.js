const dataService = require('../../services/data-service')
const { formatDateTime } = require('../../utils/format')

Page({
  data: {
    id: '',
    order: null,
    currentUserId: '',
    message: '',
    evidence: '',
    disputeReason: '',
    showDispute: false
  },

  onLoad(options) {
    this.setData({ id: options.id || '' })
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const [session, raw] = await Promise.all([
        dataService.session(),
        dataService.getOrder(this.data.id)
      ])
      if (!raw) {
        this.setData({ order: null, currentUserId: session.user ? session.user.id : '' })
        return
      }
      const order = {
        ...raw,
        roleText: raw.role === 'publisher' ? '发布者' : '接单者',
        peer: raw.role === 'publisher' ? raw.runner : raw.publisher,
        createdText: formatDateTime(raw.createdAt),
        dueText: formatDateTime(raw.serviceDueAt),
        submittedText: formatDateTime(raw.submittedAt),
        autoConfirmText: formatDateTime(raw.autoConfirmAt),
        hiddenText: formatDateTime(raw.hiddenAt),
        events: raw.events.slice().reverse().map(item => ({ ...item, timeText: formatDateTime(item.createdAt) })),
        messages: raw.messages.map(item => ({ ...item, isMe: item.senderId === session.user.id, timeText: formatDateTime(item.createdAt) }))
      }
      this.setData({ order, currentUserId: session.user.id })
      wx.setNavigationBarTitle({ title: raw.statusText })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
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

  async sendMessage() {
    try {
      await dataService.addMessage(this.data.id, this.data.message)
      this.setData({ message: '' })
      this.load()
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  openRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  backOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  }
})

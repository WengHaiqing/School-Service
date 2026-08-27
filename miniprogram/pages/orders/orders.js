const dataService = require('../../services/data-service')
const { formatDateTime } = require('../../utils/format')

function filterOrders(orders, tab) {
  if (tab === 'active') return orders.filter(order => ['active', 'grace', 'submitted', 'disputed'].includes(order.status))
  if (tab === 'closed') return orders.filter(order => ['completed', 'canceled'].includes(order.status))
  return orders
}

Page({
  data: {
    authenticated: false,
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'closed', label: '已关闭' }
    ],
    allOrders: [],
    orders: [],
    inquiries: [],
    inquiryUnreadCount: 0,
    messageSyncReady: true
  },

  onShow() {
    this.load({ silent: Boolean(this.loadedOnce) })
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  startPolling() {
    this.stopPolling()
    this.pollTimer = setInterval(() => this.load({ silent: true }), 10000)
  },

  stopPolling() {
    if (!this.pollTimer) return
    clearInterval(this.pollTimer)
    this.pollTimer = null
  },

  async load(options) {
    if (this.loadingRequest) return
    this.loadingRequest = true
    const silent = options && options.silent
    try {
      const session = await dataService.session()
      const app = getApp()
      if (app) app.globalData.session = session
      let rawOrders = []
      let rawInquiries = []
      let messageSyncReady = true
      if (session.authenticated) {
        const results = await Promise.all([
          dataService.listOrders('all'),
          dataService.listTaskInquiries().catch(() => {
            messageSyncReady = false
            return []
          })
        ])
        rawOrders = results[0]
        rawInquiries = results[1]
      }
      const allOrders = rawOrders.map(order => ({
        ...order,
        dueText: formatDateTime(order.serviceDueAt),
        roleText: order.role === 'publisher' ? '我发布的' : '我接收的',
        otherUser: order.role === 'publisher' ? order.runner : order.publisher,
        messageText: order.unreadCount > 0
          ? `${order.unreadCount}条新消息：${order.lastMessagePreview}`
          : (order.hasMessages ? `最近消息：${order.lastMessagePreview}` : '暂无聊天消息')
      }))
      const orders = filterOrders(allOrders, this.data.activeTab)
      const inquiries = rawInquiries.map(item => ({
        ...item,
        roleText: item.role === 'publisher' ? '向我咨询' : '我的咨询',
        timeText: formatDateTime(item.lastMessageAt || item.createdAt),
        previewText: item.hasMessages ? item.lastMessagePreview : '还没有消息，点击进入咨询'
      }))
      const inquiryUnreadCount = inquiries.reduce((total, item) => total + Number(item.unreadCount || 0), 0)
      const orderUnreadCount = allOrders.reduce((total, item) => total + Number(item.unreadCount || 0), 0)
      this.setData({ authenticated: session.authenticated, allOrders, orders, inquiries, inquiryUnreadCount, messageSyncReady })
      this.loadedOnce = true
      if (app && app.updateUnreadBadge) app.updateUnreadBadge(orderUnreadCount + inquiryUnreadCount)
    } catch (error) {
      if (!silent) wx.showToast({ title: error.message, icon: 'none' })
    } finally {
      this.loadingRequest = false
    }
  },

  chooseTab(event) {
    const activeTab = event.currentTarget.dataset.key
    this.setData({ activeTab, orders: filterOrders(this.data.allOrders, activeTab) })
  },

  openOrder(event) {
    const id = event.currentTarget.dataset.id
    const order = this.data.allOrders.find(item => item.id === id)
    const app = getApp()
    if (app) app.globalData.prefetchedOrder = order || null
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  openInquiry(event) {
    wx.navigateTo({ url: `/pages/chat/chat?mode=inquiry&id=${event.currentTarget.dataset.id}` })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goSearch() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})

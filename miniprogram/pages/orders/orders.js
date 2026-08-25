const dataService = require('../../services/data-service')
const { formatDateTime } = require('../../utils/format')

Page({
  data: {
    authenticated: false,
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'closed', label: '已关闭' }
    ],
    orders: []
  },

  onShow() {
    this.load()
  },

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  async load() {
    try {
      const session = await dataService.session()
      const rawOrders = session.authenticated ? await dataService.listOrders(this.data.activeTab) : []
      const orders = rawOrders.map(order => ({
        ...order,
        dueText: formatDateTime(order.serviceDueAt),
        roleText: order.role === 'publisher' ? '我发布的' : '我接的单',
        otherUser: order.role === 'publisher' ? order.runner : order.publisher
      }))
      this.setData({ authenticated: session.authenticated, orders })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  chooseTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.key })
    this.load()
  },

  openOrder(event) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${event.currentTarget.dataset.id}` })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goSearch() {
    wx.switchTab({ url: '/pages/search/search' })
  }
})

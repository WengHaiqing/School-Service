const store = require('../../services/store')
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

  onPullDownRefresh() {
    this.load()
    wx.stopPullDownRefresh()
  },

  load() {
    const session = store.session()
    const orders = session.authenticated ? store.listOrders(this.data.activeTab).map(order => ({
      ...order,
      dueText: formatDateTime(order.serviceDueAt),
      roleText: order.role === 'publisher' ? '我发布的' : '我接的单',
      otherUser: order.role === 'publisher' ? order.runner : order.publisher
    })) : []
    this.setData({ authenticated: session.authenticated, orders })
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

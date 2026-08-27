const dataService = require('./services/data-service')
const env = require('./config/env')

App({
  onLaunch() {
    if (env.USE_CLOUD) {
      if (!wx.cloud) {
        console.error('当前基础库不支持云开发，请升级调试基础库')
        return
      }
      wx.cloud.init({
        env: env.CLOUD_ENV_ID,
        traceUser: true
      })
      dataService.initialize().catch(error => {
        console.error('校园青蜓云端初始化失败', error)
      })
      return
    }
    dataService.initialize()
  },

  onShow() {
    this.startUnreadPolling()
  },

  onHide() {
    this.stopUnreadPolling()
  },

  startUnreadPolling() {
    this.stopUnreadPolling()
    this.unreadStartTimer = setTimeout(() => {
      this.unreadStartTimer = null
      this.syncUnreadBadge()
    }, 1200)
    this.unreadPollTimer = setInterval(() => this.syncUnreadBadge(), 15000)
  },

  stopUnreadPolling() {
    if (this.unreadStartTimer) {
      clearTimeout(this.unreadStartTimer)
      this.unreadStartTimer = null
    }
    if (!this.unreadPollTimer) return
    clearInterval(this.unreadPollTimer)
    this.unreadPollTimer = null
  },

  async syncUnreadBadge() {
    if (this.unreadSyncing) return
    const pages = getCurrentPages()
    const currentPage = pages.length ? pages[pages.length - 1] : null
    if (currentPage && currentPage.route === 'pages/orders/orders') return
    this.unreadSyncing = true
    try {
      const session = await dataService.session()
      this.globalData.session = session
      if (!session.authenticated) {
        this.updateUnreadBadge(0)
        return
      }
      const results = await Promise.all([
        dataService.listOrders('all'),
        dataService.listTaskInquiries()
      ])
      const unread = results[0].reduce((total, order) => total + Number(order.unreadCount || 0), 0)
        + results[1].reduce((total, item) => total + Number(item.unreadCount || 0), 0)
      this.updateUnreadBadge(unread)
    } catch (error) {
      // 云函数升级或网络异常时不打断当前页面，订单页会给出明确提示。
    } finally {
      this.unreadSyncing = false
    }
  },

  updateUnreadBadge(unread) {
    const count = Number(unread || 0)
    if (count > 0) {
      wx.setTabBarBadge({ index: 2, text: count > 99 ? '99+' : String(count) })
    } else {
      wx.removeTabBarBadge({ index: 2 })
    }
  },

  globalData: {
    brandName: '校园青蜓',
    useCloud: env.USE_CLOUD,
    cloudEnvId: env.CLOUD_ENV_ID,
    session: null,
    prefetchedTask: null,
    prefetchedOrder: null
  }
})

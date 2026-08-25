const store = require('../../services/store')
const { maskPhone } = require('../../utils/format')

Page({
  data: {
    authenticated: false,
    user: null,
    creditPercent: 0,
    stats: { published: 0, accepted: 0, active: 0 }
  },

  onShow() {
    this.load()
  },

  load() {
    const session = store.session()
    const user = session.user ? { ...session.user, phoneMasked: maskPhone(session.user.phone) } : null
    this.setData({
      authenticated: session.authenticated,
      user,
      creditPercent: user ? Math.round(user.stars / 5 * 100) : 0,
      stats: store.stats()
    })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  goRanking() {
    wx.navigateTo({ url: '/pages/ranking/ranking' })
  },

  goRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  resetDemo() {
    wx.showModal({
      title: '重置演示数据？',
      content: '将清除当前本地发布、接单和认证状态，恢复项目内置演示数据。',
      confirmText: '确认重置',
      confirmColor: '#d84941',
      success: result => {
        if (!result.confirm) return
        store.reset()
        wx.showToast({ title: '已重置', icon: 'success' })
        this.load()
      }
    })
  }
})

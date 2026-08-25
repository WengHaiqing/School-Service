const dataService = require('../../services/data-service')
const { maskPhone } = require('../../utils/format')

Page({
  data: {
    authenticated: false,
    user: null,
    cloudMode: false,
    cloudEnvironment: '',
    creditPercent: 0,
    stats: { published: 0, accepted: 0, active: 0 }
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const [session, stats] = await Promise.all([
        dataService.session(),
        dataService.stats()
      ])
      const user = session.user ? {
        ...session.user,
        phoneMasked: session.user.phoneMasked || maskPhone(session.user.phone)
      } : null
      this.setData({
        authenticated: session.authenticated,
        user,
        cloudMode: dataService.isCloudMode(),
        cloudEnvironment: dataService.environmentId(),
        creditPercent: user ? Math.round(user.stars / 5 * 100) : 0,
        stats
      })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
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
    if (dataService.isCloudMode()) {
      wx.showModal({
        title: '云端联机模式',
        content: '云端数据属于真实多用户测试记录，不能在客户端一键清空。需要删除测试数据时请在云开发控制台操作。',
        showCancel: false
      })
      return
    }
    wx.showModal({
      title: '重置演示数据？',
      content: '将清除当前本地发布、接单和认证状态，恢复项目内置演示数据。',
      confirmText: '确认重置',
      confirmColor: '#d84941',
      success: async result => {
        if (!result.confirm) return
        await dataService.reset()
        wx.showToast({ title: '已重置', icon: 'success' })
        this.load()
      }
    })
  }
})

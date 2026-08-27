const dataService = require('../../services/data-service')
const { maskPhone } = require('../../utils/format')

const EMPTY_USER = {
  nickname: '游客',
  avatarText: '游',
  school: '',
  campus: '',
  phoneMasked: '',
  studentNoMasked: '',
  stars: 0,
  completed: 0,
  onTimeRate: 0,
  walletBalance: 0,
  walletText: '0.00'
}

Page({
  data: {
    authenticated: false,
    user: EMPTY_USER,
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
      // Avoid array destructuring here. Some WeChat DevTools builds fail to
      // package the SWC helper used by destructuring and stop this page early.
      const results = await Promise.all([
        dataService.session(),
        dataService.stats()
      ])
      const session = results[0]
      const stats = results[1]
      const user = session.user ? {
        ...EMPTY_USER,
        ...session.user,
        phoneMasked: session.user.phoneMasked || maskPhone(session.user.phone),
        walletText: Number(session.user.walletBalance || 0).toFixed(2)
      } : EMPTY_USER
      this.setData({
        authenticated: session.authenticated,
        user,
        cloudMode: dataService.isCloudMode(),
        cloudEnvironment: dataService.environmentId(),
        creditPercent: session.user ? Math.round(user.stars / 5 * 100) : 0,
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

  walletAction(event) {
    if (!this.data.authenticated) return this.goLogin()
    const action = event.currentTarget.dataset.action
    const isRecharge = action === 'recharge'
    wx.showModal({
      title: isRecharge ? '测试充值（模拟）' : '测试提现（模拟）',
      content: '',
      editable: true,
      placeholderText: '请输入测试金额',
      confirmText: isRecharge ? '确认充值' : '确认提现',
      success: async result => {
        if (!result.confirm) return
        const amount = Number(result.content)
        if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) {
          wx.showToast({ title: '请输入0至5000元的金额', icon: 'none' })
          return
        }
        try {
          if (isRecharge) await dataService.rechargeWallet(amount)
          else await dataService.withdrawWallet(amount)
          wx.showToast({ title: isRecharge ? '测试充值成功' : '测试提现成功', icon: 'success' })
          this.load()
        } catch (error) {
          wx.showToast({ title: error.message, icon: 'none' })
        }
      }
    })
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

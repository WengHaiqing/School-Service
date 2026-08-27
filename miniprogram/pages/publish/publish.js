const dataService = require('../../services/data-service')

function money(value) {
  return Number(value || 0).toFixed(2)
}

Page({
  data: {
    authenticated: false,
    user: null,
    walletBalance: 0,
    walletText: '0.00',
    categories: ['校园跑腿', '跳蚤市场', '自由任务'],
    categoryIndex: 0,
    expiryOptions: [
      { label: '24小时', value: 24 },
      { label: '3天', value: 72 },
      { label: '7天', value: 168 },
      { label: '14天', value: 336 }
    ],
    expiryIndex: 1,
    title: '',
    note: '',
    amount: '',
    submitting: false
  },

  async onShow() {
    try {
      const session = await dataService.session()
      const balance = Number((session.user && session.user.walletBalance) || 0)
      this.setData({
        authenticated: session.authenticated,
        user: session.user,
        walletBalance: balance,
        walletText: money(balance)
      })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  onInput(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) })
  },

  onExpiryChange(event) {
    this.setData({ expiryIndex: Number(event.detail.value) })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goWallet() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  showInsufficientBalance(requiredAmount) {
    const shortage = Math.max(0, requiredAmount - this.data.walletBalance)
    wx.showModal({
      title: '钱包余额不足',
      content: `还差 ¥${money(shortage)}，请先到“我的”钱包充值。`,
      confirmText: '去充值',
      success: result => {
        if (result.confirm) this.goWallet()
      }
    })
  },

  async submit() {
    if (!this.data.authenticated) return this.goLogin()
    const title = this.data.title.trim()
    const note = this.data.note.trim()
    const amount = Number(this.data.amount)
    if (title.length < 2) return this.toast('任务标题至少2个字')
    if (note.length > 50) return this.toast('备注不能超过50字')
    if (!Number.isFinite(amount) || amount <= 0) return this.toast('请输入固定金额')
    if (amount > 2000) return this.toast('单笔金额不能超过2000元')
    if (amount > this.data.walletBalance) return this.showInsufficientBalance(amount)

    const risky = /(代写|论文|作业|代考|代课|签到|刷单|跑分|银行卡|贷款|赌博|色情|陪酒|代实名)/i
    if (risky.test(`${title}${note}`)) {
      wx.showModal({ title: '内容未通过预审', content: '任务可能涉及平台禁止的高风险服务，请修改后再发布。', showCancel: false })
      return
    }

    this.setData({ submitting: true })
    try {
      const task = await dataService.createTask({
        title,
        note,
        amount,
        category: this.data.categories[this.data.categoryIndex],
        expiryHours: this.data.expiryOptions[this.data.expiryIndex].value
      })
      const nextBalance = Math.max(0, this.data.walletBalance - amount)
      this.setData({ walletBalance: nextBalance, walletText: money(nextBalance) })
      wx.showToast({ title: '发布成功', icon: 'success' })
      this.resetForm()
      const app = getApp()
      if (app) app.globalData.prefetchedTask = task
      wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${task.id}` })
    } catch (error) {
      if (/余额不足/.test(error.message)) this.showInsufficientBalance(amount)
      else this.toast(error.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  resetForm() {
    this.setData({ title: '', note: '', amount: '' })
  },

  toast(title) {
    wx.showToast({ title, icon: 'none' })
  }
})

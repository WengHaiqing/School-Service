const store = require('../../services/store')

Page({
  data: {
    authenticated: false,
    user: null,
    categories: ['校园跑腿', '设计排版', '活动协助', '电脑协助'],
    categoryIndex: 0,
    expiryOptions: [
      { label: '24小时内接单', value: 24 },
      { label: '3天内接单', value: 72 },
      { label: '7天内接单', value: 168 },
      { label: '14天内接单', value: 336 }
    ],
    expiryIndex: 1,
    serviceOptions: [
      { label: '接单后24小时完成', value: 24 },
      { label: '接单后3天完成', value: 72 },
      { label: '接单后7天完成', value: 168 }
    ],
    serviceIndex: 0,
    title: '',
    description: '',
    delivery: '',
    location: '',
    amount: '',
    note: '',
    agreed: false,
    submitting: false
  },

  onShow() {
    const session = store.session()
    this.setData({ authenticated: session.authenticated, user: session.user })
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

  onServiceChange(event) {
    this.setData({ serviceIndex: Number(event.detail.value) })
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  openRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  submit() {
    if (!this.data.authenticated) return this.goLogin()
    const { title, description, delivery, location, amount, note, agreed } = this.data
    if (title.trim().length < 4) return this.toast('标题至少4个字')
    if (description.trim().length < 10) return this.toast('任务说明至少10个字')
    if (delivery.trim().length < 4) return this.toast('请写清楚交付标准')
    if (!location.trim()) return this.toast('请填写服务地点')
    if (!amount || Number(amount) <= 0) return this.toast('请填写明确金额')
    if (Number(amount) > 2000) return this.toast('MVP单笔金额不能超过2000元')
    if (note.length > 50) return this.toast('备注不能超过50字')
    if (!agreed) return this.toast('请确认任务合法合规')

    const risky = /(代写|论文|作业|代考|代课|签到|刷单|跑分|银行卡|贷款|赌博|色情|陪酒|代实名)/i
    if (risky.test(`${title}${description}${delivery}${note}`)) {
      wx.showModal({ title: '内容未通过预审', content: '任务可能涉及平台禁止的学术代办、欺诈、金融或其他高风险服务，请修改后再发布。', showCancel: false })
      return
    }

    this.setData({ submitting: true })
    try {
      const task = store.createTask({
        title,
        description,
        delivery,
        location,
        amount,
        note,
        category: this.data.categories[this.data.categoryIndex],
        expiryHours: this.data.expiryOptions[this.data.expiryIndex].value,
        serviceHours: this.data.serviceOptions[this.data.serviceIndex].value
      })
      wx.showToast({ title: '发布成功', icon: 'success' })
      this.resetForm()
      setTimeout(() => wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${task.id}` }), 500)
    } catch (error) {
      this.toast(error.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  resetForm() {
    this.setData({ title: '', description: '', delivery: '', location: '', amount: '', note: '', agreed: false })
  },

  toast(title) {
    wx.showToast({ title, icon: 'none' })
  }
})

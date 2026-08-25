const dataService = require('../../services/data-service')

Page({
  data: {
    wxReady: false,
    codeSent: false,
    phone: '',
    code: '',
    school: '海城大学',
    campus: '东校区',
    studentNo: '',
    agreed: false,
    submitting: false
  },

  doWechatLogin() {
    wx.showLoading({ title: '微信登录中' })
    wx.login({
      success: () => {
        this.setData({ wxReady: true })
        wx.hideLoading()
        wx.showToast({ title: '微信登录完成', icon: 'success' })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      }
    })
  },

  onInput(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  sendCode() {
    if (!/^1\d{10}$/.test(this.data.phone)) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' })
      return
    }
    this.setData({ codeSent: true })
    wx.showModal({ title: '开发态验证码', content: '当前尚未接入短信服务，本地演示验证码为 123456。', showCancel: false })
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed })
  },

  openRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  async submit() {
    const { wxReady, phone, code, school, campus, studentNo, agreed } = this.data
    if (!wxReady) return this.toast('请先完成微信登录')
    if (!/^1\d{10}$/.test(phone)) return this.toast('请填写正确手机号')
    if (code !== '123456') return this.toast('开发态验证码为 123456')
    if (!school.trim() || !campus.trim()) return this.toast('请填写学校和校区')
    if (studentNo.trim().length < 6) return this.toast('校园卡号或学号至少6位')
    if (!agreed) return this.toast('请阅读并同意平台规则')

    this.setData({ submitting: true })
    try {
      await dataService.completeOnboarding({ phone, school, campus, studentNo })
      wx.showToast({ title: '认证完成', icon: 'success' })
      setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 600)
    } catch (error) {
      this.toast(error.message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  toast(title) {
    wx.showToast({ title, icon: 'none' })
  }
})

const dataService = require('../../services/data-service')
const { relativeDeadline } = require('../../utils/format')

Page({
  data: {
    authenticated: false,
    user: null,
    keyword: '',
    tasks: [],
    categories: [
      { name: '校园跑腿', icon: '🛵' },
      { name: '设计排版', icon: '✦' },
      { name: '活动协助', icon: '📷' },
      { name: '电脑协助', icon: '⌨' }
    ]
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
      const [session, rawTasks] = await Promise.all([
        dataService.session(),
        dataService.listTasks()
      ])
      const tasks = rawTasks.slice(0, 4).map(task => ({
        ...task,
        deadlineText: relativeDeadline(task.expiresAt)
      }))
      this.setData({ authenticated: session.authenticated, user: session.user, tasks })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value })
  },

  submitSearch() {
    const keyword = encodeURIComponent(this.data.keyword.trim())
    if (keyword) wx.setStorageSync('pending_search_keyword', decodeURIComponent(keyword))
    wx.switchTab({ url: '/pages/search/search' })
  },

  goPublish() {
    if (!this.ensureAuth()) return
    wx.switchTab({ url: '/pages/publish/publish' })
  },

  goSearch() {
    wx.switchTab({ url: '/pages/search/search' })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goRanking() {
    wx.navigateTo({ url: '/pages/ranking/ranking' })
  },

  chooseCategory(event) {
    wx.setStorageSync('pending_search_category', event.currentTarget.dataset.name)
    wx.switchTab({ url: '/pages/search/search' })
  },

  openTask(event) {
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${event.currentTarget.dataset.id}` })
  },

  ensureAuth() {
    if (this.data.authenticated) return true
    wx.showModal({
      title: '先完成校园认证',
      content: '发布和接单前需要完成微信、手机号和校园身份三步认证。',
      confirmText: '去认证',
      success: result => {
        if (result.confirm) this.goLogin()
      }
    })
    return false
  }
})

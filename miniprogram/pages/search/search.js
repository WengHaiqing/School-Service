const dataService = require('../../services/data-service')
const { relativeDeadline } = require('../../utils/format')

Page({
  data: {
    keyword: '',
    activeCategory: '全部',
    categories: ['全部', '校园跑腿', '跳蚤市场', '自由任务'],
    tasks: []
  },

  onShow() {
    const keyword = wx.getStorageSync('pending_search_keyword') || this.data.keyword
    const category = wx.getStorageSync('pending_search_category') || this.data.activeCategory
    wx.removeStorageSync('pending_search_keyword')
    wx.removeStorageSync('pending_search_category')
    this.setData({ keyword, activeCategory: category })
    this.load()
  },

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  async load() {
    try {
      const rawTasks = await dataService.listTasks({
        keyword: this.data.keyword,
        category: this.data.activeCategory
      })
      this.setData({ tasks: rawTasks.map(task => ({ ...task, deadlineText: relativeDeadline(task.expiresAt) })) })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value })
  },

  submitSearch() {
    this.load()
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this.load()
  },

  chooseCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.name })
    this.load()
  },

  openTask(event) {
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${event.currentTarget.dataset.id}` })
  },

  async goPublish() {
    try {
      const session = await dataService.session()
      if (!session.authenticated) {
        wx.navigateTo({ url: '/pages/login/login' })
        return
      }
      wx.switchTab({ url: '/pages/publish/publish' })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  }
})

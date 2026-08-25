const store = require('../../services/store')
const { relativeDeadline } = require('../../utils/format')

Page({
  data: {
    keyword: '',
    activeCategory: '全部',
    categories: ['全部', '校园跑腿', '设计排版', '活动协助', '电脑协助'],
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

  onPullDownRefresh() {
    this.load()
    wx.stopPullDownRefresh()
  },

  load() {
    const tasks = store.listTasks({
      keyword: this.data.keyword,
      category: this.data.activeCategory
    }).map(task => ({ ...task, deadlineText: relativeDeadline(task.expiresAt) }))
    this.setData({ tasks })
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

  goPublish() {
    const session = store.session()
    if (!session.authenticated) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.switchTab({ url: '/pages/publish/publish' })
  }
})

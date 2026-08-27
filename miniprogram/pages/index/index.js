const dataService = require('../../services/data-service')
const { relativeDeadline } = require('../../utils/format')

const LOCATION_KEY = 'campus_dragonfly_browse_location'

function visibleTasks(allTasks, category, amountSort) {
  const filtered = category === '全部'
    ? allTasks.slice()
    : allTasks.filter(task => task.category === category)
  if (amountSort === 'asc') {
    filtered.sort((left, right) => Number(left.amount) - Number(right.amount))
  } else if (amountSort === 'desc') {
    filtered.sort((left, right) => Number(right.amount) - Number(left.amount))
  }
  return filtered.slice(0, 12)
}

Page({
  data: {
    authenticated: false,
    user: null,
    region: ['', '', ''],
    schoolInput: '',
    locatedSchool: '',
    activeCategory: '全部',
    amountSort: '',
    categories: [
      { name: '校园跑腿', icon: '🛵', desc: '代取代送' },
      { name: '跳蚤市场', icon: '♻', desc: '闲置买卖' },
      { name: '自由任务', icon: '✦', desc: '自由需求' }
    ],
    allTasks: [],
    tasks: [],
    loading: false
  },

  onShow() {
    this.load({ silent: Boolean(this.loadedOnce) })
  },

  async onPullDownRefresh() {
    await this.load()
    wx.stopPullDownRefresh()
  },

  async load(options) {
    const requestId = (this.loadRequestId || 0) + 1
    this.loadRequestId = requestId
    const silent = options && options.silent
    if (!silent) this.setData({ loading: true })
    try {
      const session = await dataService.session()
      const app = getApp()
      if (app) app.globalData.session = session
      const saved = wx.getStorageSync(LOCATION_KEY) || {}
      const verifiedSchool = session.authenticated && session.user ? session.user.school : ''
      const school = this.data.locatedSchool || saved.school || verifiedSchool
      const region = this.data.region[0] ? this.data.region : (saved.region || ['', '', ''])
      const rawTasks = await dataService.listTasks({ school, category: '全部' })
      const allTasks = rawTasks.map(task => ({
        ...task,
        deadlineText: relativeDeadline(task.expiresAt)
      }))
      const tasks = visibleTasks(allTasks, this.data.activeCategory, this.data.amountSort)
      if (requestId !== this.loadRequestId) return
      this.setData({
        authenticated: session.authenticated,
        user: session.user,
        schoolInput: this.data.schoolInput || school,
        locatedSchool: school,
        region,
        allTasks,
        tasks
      })
      this.loadedOnce = true
    } catch (error) {
      if (requestId === this.loadRequestId) wx.showToast({ title: error.message, icon: 'none' })
    } finally {
      if (requestId === this.loadRequestId) this.setData({ loading: false })
    }
  },

  onRegionChange(event) {
    this.setData({ region: event.detail.value })
  },

  onSchoolInput(event) {
    this.setData({ schoolInput: event.detail.value })
  },

  applyLocation() {
    const school = this.data.schoolInput.trim()
    if (!school) {
      wx.showToast({ title: '请输入学校名称', icon: 'none' })
      return
    }
    wx.setStorageSync(LOCATION_KEY, { region: this.data.region, school })
    this.setData({ locatedSchool: school })
    this.load()
  },

  chooseCategory(event) {
    const category = event.currentTarget.dataset.name
    const activeCategory = this.data.activeCategory === category ? '全部' : category
    this.setData({
      activeCategory,
      tasks: visibleTasks(this.data.allTasks, activeCategory, this.data.amountSort)
    })
  },

  chooseAmountSort(event) {
    const sort = event.currentTarget.dataset.sort
    const amountSort = this.data.amountSort === sort ? '' : sort
    this.setData({
      amountSort,
      tasks: visibleTasks(this.data.allTasks, this.data.activeCategory, amountSort)
    })
  },

  goPublish() {
    if (!this.ensureAuth()) return
    wx.switchTab({ url: '/pages/publish/publish' })
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  openTask(event) {
    const id = event.currentTarget.dataset.id
    const task = this.data.allTasks.find(item => item.id === id)
    const app = getApp()
    if (app) app.globalData.prefetchedTask = task || null
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${id}` })
  },

  ensureAuth() {
    if (this.data.authenticated) return true
    wx.showModal({
      title: '先完成校园认证',
      content: '发布和接单前需要完成微信、手机号和校园身份认证。',
      confirmText: '去认证',
      success: result => {
        if (result.confirm) this.goLogin()
      }
    })
    return false
  }
})

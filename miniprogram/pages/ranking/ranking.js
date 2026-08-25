const dataService = require('../../services/data-service')

Page({
  data: {
    users: []
  },

  async onShow() {
    try {
      this.setData({ users: await dataService.ranking() })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    }
  }
})

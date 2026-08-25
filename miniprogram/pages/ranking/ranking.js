const store = require('../../services/store')

Page({
  data: {
    users: []
  },

  onShow() {
    this.setData({ users: store.ranking() })
  }
})

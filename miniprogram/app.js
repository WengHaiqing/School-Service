const store = require('./services/store')

App({
  onLaunch() {
    store.initialize()
    store.sweep()
  },
  globalData: {
    brandName: '校园青蜓'
  }
})

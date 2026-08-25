const dataService = require('./services/data-service')
const env = require('./config/env')

App({
  onLaunch() {
    if (env.USE_CLOUD) {
      if (!wx.cloud) {
        console.error('当前基础库不支持云开发，请升级调试基础库')
        return
      }
      wx.cloud.init({
        env: env.CLOUD_ENV_ID,
        traceUser: true
      })
      dataService.initialize().catch(error => {
        console.error('校园青蜓云端初始化失败', error)
      })
      return
    }
    dataService.initialize()
  },
  globalData: {
    brandName: '校园青蜓',
    useCloud: env.USE_CLOUD,
    cloudEnvId: env.CLOUD_ENV_ID
  }
})

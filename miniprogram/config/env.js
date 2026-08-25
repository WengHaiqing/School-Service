module.exports = {
  // 正式联机开发环境。环境 ID 不是密钥，可以随小程序代码发布。
  CLOUD_ENV_ID: 'cloud1-d1gdlvruj6129b660',

  // true：所有业务数据通过云函数同步；false：使用原有本地演示数据。
  USE_CLOUD: true,

  // 云端不可用时不静默回退，避免用户误以为数据已经同步。
  ALLOW_LOCAL_FALLBACK: false
}

const env = require('../config/env')
const localStore = require('./store')
const cloudStore = require('./cloud-store')

const selectedStore = env.USE_CLOUD ? cloudStore : localStore

function asPromise(method, args) {
  try {
    return Promise.resolve(selectedStore[method](...args))
  } catch (error) {
    return Promise.reject(error)
  }
}

const api = {}
Object.keys(selectedStore).forEach(method => {
  api[method] = (...args) => asPromise(method, args)
})

api.isCloudMode = () => env.USE_CLOUD
api.environmentId = () => env.CLOUD_ENV_ID

module.exports = api

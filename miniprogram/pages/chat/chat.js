const dataService = require('../../services/data-service')
const { formatDateTime } = require('../../utils/format')

Page({
  data: {
    id: '',
    taskId: '',
    mode: 'order',
    context: null,
    peer: null,
    currentUserId: '',
    messages: [],
    lastMessageId: '',
    message: '',
    canSend: false,
    sending: false,
    loading: true
  },

  onLoad(options) {
    this.setData({
      id: options.id || '',
      taskId: options.taskId || '',
      mode: options.mode === 'inquiry' ? 'inquiry' : 'order'
    })
  },

  onShow() {
    this.load()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  async onPullDownRefresh() {
    await this.load({ silent: true })
    wx.stopPullDownRefresh()
  },

  startPolling() {
    this.stopPolling()
    this.pollTimer = setInterval(() => this.load({ silent: true }), 8000)
  },

  stopPolling() {
    if (!this.pollTimer) return
    clearInterval(this.pollTimer)
    this.pollTimer = null
  },

  async load(options) {
    const canOpenInquiry = this.data.mode === 'inquiry' && this.data.taskId
    if (this.loadingRequest || (!this.data.id && !canOpenInquiry)) return
    this.loadingRequest = true
    const silent = options && options.silent
    if (!silent && !this.data.context) this.setData({ loading: true })
    try {
      const contextRequest = this.data.mode === 'inquiry'
        ? (this.data.id
            ? dataService.getTaskInquiry(this.data.id)
            : dataService.openTaskInquiry(this.data.taskId))
        : dataService.getOrder(this.data.id)
      const results = await Promise.all([
        dataService.session(),
        contextRequest
      ])
      const session = results[0]
      const raw = results[1]
      if (!raw) {
        this.setData({ context: null, peer: null, loading: false })
        return
      }
      const peer = this.data.mode === 'inquiry'
        ? raw.peer
        : (raw.role === 'publisher' ? raw.runner : raw.publisher)
      const rawMessages = raw.messages || []
      const messages = rawMessages.map(item => ({
        ...item,
        isMe: item.senderId === session.user.id,
        timeText: formatDateTime(item.createdAt)
      }))
      const lastMessage = messages.length ? messages[messages.length - 1] : null
      const previousLastId = this.data.lastMessageId
      const lastMessageId = lastMessage ? `message-${lastMessage.id}` : ''
      this.setData({
        id: this.data.id || raw.id,
        context: raw,
        peer,
        currentUserId: session.user.id,
        messages,
        lastMessageId,
        canSend: typeof raw.canSend === 'boolean' ? raw.canSend : (raw.status !== 'completed' && raw.status !== 'canceled'),
        loading: false
      })
      wx.setNavigationBarTitle({ title: peer ? `与${peer.nickname}沟通` : '订单沟通' })
      if (Number(raw.unreadCount || 0) > 0) {
        if (this.data.mode === 'inquiry') await dataService.markTaskInquiryRead(this.data.id)
        else await dataService.markOrderMessagesRead(this.data.id)
        const app = getApp()
        if (app && app.syncUnreadBadge) app.syncUnreadBadge()
      }
      if (lastMessageId && lastMessageId !== previousLastId) this.scrollToLatest(lastMessageId)
    } catch (error) {
      this.setData({ loading: false })
      if (!silent) wx.showToast({ title: error.message, icon: 'none' })
    } finally {
      this.loadingRequest = false
    }
  },

  scrollToLatest(lastMessageId) {
    this.setData({ lastMessageId: '' })
    setTimeout(() => this.setData({ lastMessageId }), 80)
  },

  onInput(event) {
    this.setData({ message: event.detail.value })
  },

  async sendMessage() {
    const content = (this.data.message || '').trim()
    if (!content || this.data.sending || !this.data.canSend) return
    this.setData({ sending: true })
    try {
      if (this.data.mode === 'inquiry') await dataService.addTaskInquiryMessage(this.data.id, content)
      else await dataService.addMessage(this.data.id, content)
      this.setData({ message: '' })
      await this.load({ silent: true })
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' })
    } finally {
      this.setData({ sending: false })
    }
  },

  openRules() {
    wx.navigateTo({ url: '/pages/rules/rules' })
  },

  backOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  }
})

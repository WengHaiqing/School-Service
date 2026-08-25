function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  return `${sameYear ? '' : `${date.getFullYear()}年`}${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function relativeDeadline(value) {
  if (!value) return '--'
  const diff = new Date(value).getTime() - Date.now()
  if (diff <= 0) return '已截止'
  const hours = Math.ceil(diff / 3600000)
  if (hours <= 24) return `${hours}小时后截止`
  const days = Math.ceil(hours / 24)
  return `${days}天后截止`
}

function maskPhone(value) {
  if (!value || value.length < 7) return value || '--'
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

function orderStatus(status) {
  const map = {
    active: { text: '进行中', tone: 'warm' },
    grace: { text: '顺延中', tone: 'danger' },
    submitted: { text: '待验收', tone: 'brand' },
    disputed: { text: '争议处理中', tone: 'danger' },
    completed: { text: '已完成', tone: 'neutral' },
    canceled: { text: '已取消', tone: 'neutral' }
  }
  return map[status] || { text: status, tone: 'neutral' }
}

module.exports = {
  formatDateTime,
  relativeDeadline,
  maskPhone,
  orderStatus
}

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command

function event(title, detail) {
  return {
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actorId: 'system',
    title,
    detail,
    createdAt: new Date()
  }
}

exports.main = async () => {
  const current = new Date()
  const summary = { expiredTasks: 0, graceOrders: 0, canceledOrders: 0, completedOrders: 0 }

  const tasks = await db.collection('tasks').where({ status: 'open' }).limit(100).get()
  for (const task of tasks.data) {
    if (new Date(task.expiresAt).getTime() <= current.getTime()) {
      await db.collection('tasks').doc(task._id).update({ data: { status: 'expired', updatedAt: current } })
      summary.expiredTasks += 1
    }
  }

  const activeOrders = await db.collection('orders').where({ status: 'active' }).limit(100).get()
  for (const order of activeOrders.data) {
    if (new Date(order.serviceDueAt).getTime() <= current.getTime()) {
      await db.collection('orders').doc(order._id).update({
        data: {
          status: 'grace',
          graceUntil: new Date(Date.now() + 24 * 3600000),
          events: command.push(event('订单顺延24小时', '接单者未在履约截止时间前提交完成凭证')),
          updatedAt: current
        }
      })
      summary.graceOrders += 1
    }
  }

  const graceOrders = await db.collection('orders').where({ status: 'grace' }).limit(100).get()
  for (const order of graceOrders.data) {
    if (order.graceUntil && new Date(order.graceUntil).getTime() <= current.getTime()) {
      await db.collection('orders').doc(order._id).update({
        data: {
          status: 'canceled',
          paymentStatus: 'simulated_refunded',
          hiddenAt: new Date(Date.now() + 7 * 86400000),
          events: command.push(event('订单自动取消', '顺延期结束后仍未提交，模拟款项原路退回')),
          updatedAt: current
        }
      })
      summary.canceledOrders += 1
    }
  }

  const submittedOrders = await db.collection('orders').where({ status: 'submitted' }).limit(100).get()
  for (const order of submittedOrders.data) {
    if (order.autoConfirmAt && new Date(order.autoConfirmAt).getTime() <= current.getTime()) {
      await db.collection('orders').doc(order._id).update({
        data: {
          status: 'completed',
          paymentStatus: 'simulated_settled',
          completedAt: current,
          hiddenAt: new Date(Date.now() + 7 * 86400000),
          events: command.push(event('系统自动验收', '发布者在24小时内未提出异议')),
          updatedAt: current
        }
      })
      summary.completedOrders += 1
    }
  }

  console.log('[campusSweep]', summary)
  return summary
}

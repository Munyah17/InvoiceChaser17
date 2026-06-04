import { supabase } from '../lib/supabase'

/**
 * Invoice Chaser Engine
 * Automatically tracks overdue invoices and schedules reminders
 */

const REMINDER_SCHEDULES = {
  before_due_3: { days: -3, label: '3 days before due', priority: 'low' },
  before_due_1: { days: -1, label: '1 day before due', priority: 'medium' },
  on_due_date: { days: 0, label: 'On due date', priority: 'medium' },
  overdue_1: { days: 1, label: '1 day overdue', priority: 'high' },
  overdue_3: { days: 3, label: '3 days overdue', priority: 'high' },
  overdue_7: { days: 7, label: '7 days overdue', priority: 'urgent' },
  overdue_14: { days: 14, label: '14 days overdue', priority: 'urgent' },
  overdue_30: { days: 30, label: '30 days overdue', priority: 'critical' },
}

/**
 * Check if an invoice is overdue based on specific logic
 * Logic: IF invoice.status = pending AND today > due_date + 7 days THEN mark as overdue
 * @param {Object} invoice - Invoice object
 * @returns {boolean} - Is overdue
 */
export const isInvoiceOverdue = (invoice) => {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return false
  }
  const dueDate = new Date(invoice.due_date)
  const sevenDaysAfterDue = new Date(dueDate)
  sevenDaysAfterDue.setDate(sevenDaysAfterDue.getDate() + 7)
  const today = new Date()
  return today > sevenDaysAfterDue
}

/**
 * Get days overdue for an invoice
 * @param {Object} invoice - Invoice object
 * @returns {number} - Days overdue (negative if not overdue)
 */
export const getDaysOverdue = (invoice) => {
  const dueDate = new Date(invoice.due_date)
  const today = new Date()
  const diffTime = dueDate - today
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Update invoice status to overdue if it meets the criteria
 * @param {Object} invoice - Invoice object
 * @returns {Promise<Object>} - Updated invoice or error
 */
export const updateOverdueStatus = async (invoice) => {
  if (invoice.status !== 'pending') {
    return { invoice, updated: false }
  }

  const shouldMarkOverdue = isInvoiceOverdue(invoice)
  
  if (shouldMarkOverdue && invoice.status !== 'overdue') {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('id', invoice.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice status:', error)
      return { error, updated: false }
    }

    return { invoice: data, updated: true }
  }

  return { invoice, updated: false }
}

/**
 * Calculate next reminder date for an invoice
 * @param {Object} invoice - Invoice object
 * @returns {Date|null} - Next reminder date or null if no more reminders needed
 */
export const calculateNextReminder = (invoice) => {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return null
  }

  const daysOverdue = getDaysOverdue(invoice)
  const dueDate = new Date(invoice.due_date)
  const today = new Date()

  // Find the next reminder schedule that hasn't passed yet
  for (const [key, schedule] of Object.entries(REMINDER_SCHEDULES)) {
    const reminderDate = new Date(dueDate)
    reminderDate.setDate(reminderDate.getDate() + schedule.days)
    
    // Only schedule if reminder date is in the future
    if (reminderDate > today) {
      return reminderDate
    }
  }

  return null
}

/**
 * Create reminder schedules for a new invoice
 * @param {Object} invoice - Invoice object
 * @returns {Array} - Array of reminder objects to create
 */
export const createReminderSchedule = (invoice) => {
  const reminders = []
  const dueDate = new Date(invoice.due_date)

  for (const [key, schedule] of Object.entries(REMINDER_SCHEDULES)) {
    const scheduledDate = new Date(dueDate)
    scheduledDate.setDate(scheduledDate.getDate() + schedule.days)
    
    reminders.push({
      invoice_id: invoice.id,
      type: key,
      scheduled_at: scheduledDate.toISOString(),
      status: 'pending',
      priority: schedule.priority,
      label: schedule.label,
    })
  }

  return reminders
}

/**
 * Get pending reminders that should be sent today
 * @returns {Promise<Array>} - Array of pending reminders
 */
export const getPendingReminders = async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('reminders')
    .select(`
      *,
      invoices (
        invoice_number,
        amount,
        due_date,
        status,
        customer_name,
        customer_email
      )
    `)
    .eq('status', 'pending')
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.error('Error fetching pending reminders:', error)
    return []
  }

  return data
}

/**
 * Send a reminder email
 * @param {Object} reminder - Reminder object with invoice data
 * @returns {Promise<boolean>} - Success status
 */
export const sendReminderEmail = async (reminder) => {
  const invoice = reminder.invoices
  const customerEmail = invoice?.customer_email
  const customerName = invoice?.customer_name

  if (!customerEmail) {
    console.error('No customer email for reminder:', reminder.id)
    return false
  }

  const dueDate = new Date(invoice.due_date).toLocaleDateString()
  const subject = `Payment Reminder: Invoice ${invoice.invoice_number}`
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <h2 style="color:#1a1a1a">Payment Reminder</h2>
    <p>Dear ${customerName || 'Customer'},</p>
    <p>This is a reminder that invoice <strong>${invoice.invoice_number}</strong> for <strong>$${invoice.amount}</strong> is due on <strong>${dueDate}</strong>.</p>
    <p>Please ensure payment is arranged to avoid any late fees.</p>
  </div>`

  try {
    const { error } = await supabase.functions.invoke('send_reminder_email', {
      body: { to: customerEmail, subject, html }
    })

    if (error) throw error

    await supabase
      .from('reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', reminder.id)

    return true
  } catch (error) {
    console.error('Error sending reminder email:', error)

    await supabase
      .from('reminders')
      .update({ status: 'failed' })
      .eq('id', reminder.id)

    return false
  }
}

/**
 * Process all pending reminders for the day
 * @returns {Promise<Object>} - Processing results
 */
export const processDailyReminders = async () => {
  const pendingReminders = await getPendingReminders()
  
  let sent = 0
  let failed = 0
  const errors = []

  for (const reminder of pendingReminders) {
    const success = await sendReminderEmail(reminder)
    if (success) {
      sent++
    } else {
      failed++
      errors.push({
        reminderId: reminder.id,
        invoiceNumber: reminder.invoices?.invoice_number,
        error: 'Failed to send email',
      })
    }
  }

  return {
    total: pendingReminders.length,
    sent,
    failed,
    errors,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get invoice status summary
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Status summary
 */
export const getInvoiceStatusSummary = async (userId) => {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('status, amount, due_date')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching invoices:', error)
    return null
  }

  const summary = {
    total: invoices.length,
    paid: 0,
    pending: 0,
    overdue: 0,
    draft: 0,
    cancelled: 0,
    totalAmount: 0,
    overdueAmount: 0,
  }

  const today = new Date()

  for (const invoice of invoices) {
    summary.totalAmount += parseFloat(invoice.amount) || 0
    
    if (invoice.status === 'paid') {
      summary.paid++
    } else if (invoice.status === 'pending') {
      const dueDate = new Date(invoice.due_date)
      if (dueDate < today) {
        summary.overdue++
        summary.overdueAmount += parseFloat(invoice.amount) || 0
      } else {
        summary.pending++
      }
    } else if (invoice.status === 'draft') {
      summary.draft++
    } else if (invoice.status === 'cancelled') {
      summary.cancelled++
    }
  }

  return summary
}

/**
 * Get overdue invoices with priority
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Overdue invoices with priority levels
 */
export const getOverdueInvoicesWithPriority = async (userId) => {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'paid')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching overdue invoices:', error)
    return []
  }

  const today = new Date()
  const overdueInvoices = []

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.due_date)
    if (dueDate < today) {
      const daysOverdue = getDaysOverdue(invoice)
      let priority = 'low'
      
      if (daysOverdue <= -7) priority = 'medium'
      else if (daysOverdue <= -14) priority = 'high'
      else if (daysOverdue <= -30) priority = 'urgent'
      else if (daysOverdue <= -60) priority = 'critical'

      overdueInvoices.push({
        ...invoice,
        daysOverdue: Math.abs(daysOverdue),
        priority,
      })
    }
  }

  // Sort by priority (critical first) then by days overdue
  const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 }
  overdueInvoices.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.daysOverdue - a.daysOverdue
  })

  return overdueInvoices
}

/**
 * Manually trigger a reminder for an invoice
 * @param {string} invoiceId - Invoice ID
 * @param {string} reminderType - Type of reminder to send
 * @returns {Promise<boolean>} - Success status
 */
export const triggerManualReminder = async (invoiceId, reminderType = 'manual') => {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (error || !invoice) {
    console.error('Error fetching invoice:', error)
    return false
  }

  const reminder = {
    id: `manual-${Date.now()}`,
    invoice_id: invoiceId,
    type: reminderType,
    scheduled_at: new Date().toISOString(),
    status: 'pending',
    priority: 'high',
    label: 'Manual Reminder',
    invoices: invoice,
  }

  return await sendReminderEmail(reminder)
}

export default {
  REMINDER_SCHEDULES,
  isInvoiceOverdue,
  getDaysOverdue,
  calculateNextReminder,
  createReminderSchedule,
  getPendingReminders,
  sendReminderEmail,
  processDailyReminders,
  getInvoiceStatusSummary,
  getOverdueInvoicesWithPriority,
  triggerManualReminder,
}

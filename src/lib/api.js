import { supabase } from './supabase'
import { resolveRole } from '../utils/rbac'

// Role resolution — prefers profiles.role, falls back to users.is_admin
export const getUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileData?.role) return profileData.role

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return resolveRole(null, userData?.is_admin)
}

// Profile API
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, company_name, role, plan, created_at')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// Invoices API
export const getInvoices = async (userId) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, customer_email, amount, currency, status, due_date, description, notes, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  return { data, error }
}

export const createInvoice = async (invoice) => {
  const { data, error } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .single()
  return { data, error }
}

export const updateInvoice = async (id, updates) => {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteInvoice = async (id) => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
  return { error }
}

export const getInvoiceById = async (id) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

// Customers API
export const getCustomers = async (userId) => {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, company, phone, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  return { data, error }
}

export const createCustomer = async (customer) => {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  return { data, error }
}

export const updateCustomer = async (id, updates) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteCustomer = async (id) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  return { error }
}

export const getCustomerByEmail = async (userId, email) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .eq('email', email)
    .single()
  return { data, error }
}

// Reminders API
export const getReminders = async (userId) => {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, type, status, scheduled_at, sent_at, invoice_id, invoices(invoice_number, customer_name, customer_email, amount, due_date)')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: false })
    .limit(200)
  return { data, error }
}

export const createReminder = async (reminder) => {
  const { data, error } = await supabase
    .from('reminders')
    .insert(reminder)
    .select()
    .single()
  return { data, error }
}

export const updateReminder = async (id, updates) => {
  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      invoices (
        invoice_number,
        customer_name,
        customer_email,
        amount,
        due_date
      )
    `)
    .single()
  return { data, error }
}

export const getRemindersByInvoice = async (invoiceId) => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('scheduled_at', { ascending: true })
  return { data, error }
}

// Payments API
export const getPayments = async (userId) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoices (
        invoice_number,
        amount
      )
    `)
    .in('invoice_id',
      supabase.from('invoices').select('id').eq('user_id', userId)
    )
    .order('created_at', { ascending: false })
  return { data, error }
}

export const createPayment = async (payment) => {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()
  return { data, error }
}

export const updatePayment = async (id, updates) => {
  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Subscriptions API
export const getSubscription = async (userId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return { data, error }
}

export const createSubscription = async (subscription) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(subscription)
    .select()
    .single()
  return { data, error }
}

export const updateSubscription = async (id, updates) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Email Templates API
export const getEmailTemplates = async (userId) => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export const upsertEmailTemplate = async (template) => {
  const { data, error } = await supabase
    .from('email_templates')
    .upsert(template)
    .select()
    .single()
  return { data, error }
}

// Invoice Chaser Engine - Check for overdue invoices
export const checkOverdueInvoices = async () => {
  const { data, error } = await supabase.rpc('check_invoice_status')
  return { data, error }
}

// Get invoice statistics
export const getInvoiceStats = async (userId) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('status, amount')
    .eq('user_id', userId)
  
  if (error) return { data: null, error }
  
  const stats = {
    total: data.length,
    paid: data.filter(i => i.status === 'paid').length,
    pending: data.filter(i => i.status === 'pending').length,
    overdue: data.filter(i => i.status === 'overdue').length,
    draft: data.filter(i => i.status === 'draft').length,
    totalRevenue: data.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.amount), 0),
    pendingRevenue: data.filter(i => i.status === 'pending').reduce((sum, i) => sum + parseFloat(i.amount), 0),
    overdueRevenue: data.filter(i => i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.amount), 0),
  }
  
  return { data: stats, error: null }
}

// Real-time subscription helpers
export const subscribeToInvoices = (userId, callback) => {
  return supabase
    .channel('invoices-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe()
}

export const subscribeToReminders = (userId, callback) => {
  return supabase
    .channel('reminders-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reminders',
      },
      (payload) => {
        // Filter by user_id through invoice relationship
        callback(payload)
      }
    )
    .subscribe()
}

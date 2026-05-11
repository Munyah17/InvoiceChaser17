import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from '../lib/api'

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      invoices: [],
      customers: [],
      reminders: [],
      templates: {
        '3_days_before': {
          subject: 'Payment Reminder: Invoice {{invoice_number}} due in 3 days',
          body: 'Hi {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{currency}} {{amount}} is due on {{due_date}}.\n\nPlease ensure payment is arranged to avoid any late fees.\n\nBest regards,\n{{company_name}}'
        },
        'on_due_date': {
          subject: 'Invoice {{invoice_number}} is Due Today',
          body: 'Hi {{customer_name}},\n\nYour invoice {{invoice_number}} for {{currency}} {{amount}} is due today.\n\nPlease process payment at your earliest convenience.\n\nBest regards,\n{{company_name}}'
        },
        '7_days_overdue': {
          subject: 'OVERDUE: Invoice {{invoice_number}} — Payment Required',
          body: 'Hi {{customer_name}},\n\nYour invoice {{invoice_number}} for {{currency}} {{amount}} is now 7 days overdue (due: {{due_date}}).\n\nPlease settle this invoice immediately.\n\nBest regards,\n{{company_name}}'
        },
        '14_days_overdue': {
          subject: 'FINAL NOTICE: Invoice {{invoice_number}} — Immediate Action Required',
          body: 'Hi {{customer_name}},\n\nThis is a final notice regarding invoice {{invoice_number}} for {{currency}} {{amount}}, now 14 days overdue.\n\nImmediate payment is required. Please contact us urgently.\n\nBest regards,\n{{company_name}}'
        }
      },
      settings: {
        full_name: '',
        company_name: '',
        email: '',
      },
      loading: false,
      
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setInvoices: (invoices) => set({ invoices }),
      setCustomers: (customers) => set({ customers }),
      setReminders: (reminders) => set({ reminders }),
      setTemplates: (templates) => set({ templates }),
      setSettings: (settings) => set({ settings }),
      setLoading: (loading) => set({ loading }),
      
      // Load data from Supabase
      loadInvoices: async (userId) => {
        set({ loading: true })
        const { data, error } = await api.getInvoices(userId)
        if (!error && data) {
          set({ invoices: data })
        }
        set({ loading: false })
        return { data, error }
      },
      
      loadCustomers: async (userId) => {
        set({ loading: true })
        const { data, error } = await api.getCustomers(userId)
        if (!error && data) {
          set({ customers: data })
        }
        set({ loading: false })
        return { data, error }
      },
      
      loadReminders: async (userId) => {
        set({ loading: true })
        const { data, error } = await api.getReminders(userId)
        if (!error && data) {
          set({ reminders: data })
        }
        set({ loading: false })
        return { data, error }
      },
      
      loadProfile: async (userId) => {
        const { data, error } = await api.getProfile(userId)
        if (!error && data) {
          set({ 
            settings: {
              full_name: data.full_name || '',
              company_name: data.company_name || '',
              email: data.email || '',
            }
          })
        }
        return { data, error }
      },
      
      // Invoice operations with Supabase
      addInvoice: async (invoice) => {
        set({ loading: true })
        const { data, error } = await api.createInvoice(invoice)
        if (!error && data) {
          set((state) => ({ invoices: [data, ...state.invoices] }))
        }
        set({ loading: false })
        return { data, error }
      },
      
      updateInvoice: async (id, updates) => {
        set({ loading: true })
        const { data, error } = await api.updateInvoice(id, updates)
        if (!error && data) {
          set((state) => ({
            invoices: state.invoices.map(inv => inv.id === id ? data : inv)
          }))
        }
        set({ loading: false })
        return { data, error }
      },
      
      deleteInvoice: async (id) => {
        set({ loading: true })
        const { error } = await api.deleteInvoice(id)
        if (!error) {
          set((state) => ({
            invoices: state.invoices.filter(inv => inv.id !== id)
          }))
        }
        set({ loading: false })
        return { error }
      },
      
      // Customer operations with Supabase
      addCustomer: async (customer) => {
        set({ loading: true })
        const { data, error } = await api.createCustomer(customer)
        if (!error && data) {
          set((state) => ({ customers: [...state.customers, data] }))
        }
        set({ loading: false })
        return { data, error }
      },
      
      updateCustomer: async (id, updates) => {
        set({ loading: true })
        const { data, error } = await api.updateCustomer(id, updates)
        if (!error && data) {
          set((state) => ({
            customers: state.customers.map(cust => cust.id === id ? data : cust)
          }))
        }
        set({ loading: false })
        return { data, error }
      },
      
      deleteCustomer: async (id) => {
        set({ loading: true })
        const { error } = await api.deleteCustomer(id)
        if (!error) {
          set((state) => ({
            customers: state.customers.filter(cust => cust.id !== id)
          }))
        }
        set({ loading: false })
        return { error }
      },
      
      // Reminder operations
      addReminder: async (reminder) => {
        set({ loading: true })
        const { data, error } = await api.createReminder(reminder)
        if (!error && data) {
          set((state) => ({ reminders: [...state.reminders, data] }))
        }
        set({ loading: false })
        return { data, error }
      },
      
      updateReminder: async (id, updates) => {
        set({ loading: true })
        const { data, error } = await api.updateReminder(id, updates)
        if (!error && data) {
          set((state) => ({
            reminders: state.reminders.map(rem => rem.id === id ? data : rem)
          }))
        }
        set({ loading: false })
        return { data, error }
      },
      
      // Profile operations
      updateProfile: async (userId, updates) => {
        set({ loading: true })
        const { data, error } = await api.updateProfile(userId, updates)
        if (!error && data) {
          set({ 
            settings: {
              full_name: data.full_name || '',
              company_name: data.company_name || '',
              email: data.email || '',
            }
          })
        }
        set({ loading: false })
        return { data, error }
      },
      
      logout: () => set({ user: null, session: null, invoices: [], customers: [], reminders: [] }),
    }),
    {
      name: 'invoice-chaser-storage',
      partialize: (state) => ({ 
        settings: state.settings,
        templates: state.templates 
      }),
    }
  )
)

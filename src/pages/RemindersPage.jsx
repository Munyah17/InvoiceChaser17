import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import Input from '../components/Input'
import { formatDate } from '../utils/dateFormat'

export default function RemindersPage() {
  const { user, reminders, templates, setTemplates, updateReminder, loadReminders } = useStore()
  const [activeTab, setActiveTab] = useState('log')
  const [activeTmpl, setActiveTmpl] = useState('3_days_before')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (user) {
      loadReminders(user.id)
    }
  }, [user])

  const fmtDate = (d) => formatDate(d)

  const dotCls = {
    sent: 'bg-neutral-900',
    pending: 'bg-amber-500',
    failed: 'bg-red-500',
    skipped: 'bg-neutral-400',
  }

  const bCls = {
    sent: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
    skipped: 'bg-neutral-100 text-neutral-500 border border-neutral-200',
  }

  const handleLoadTemplate = () => {
    const tmpl = templates[activeTmpl]
    if (tmpl) {
      setSubject(tmpl.subject)
      setBody(tmpl.body)
    }
  }

  const handleSaveTemplate = () => {
    setTemplates({
      ...templates,
      [activeTmpl]: { subject, body }
    })
  }

  const handleSendReminder = async (reminder) => {
    const invoice = reminder.invoices
    if (!invoice?.customer_email) {
      console.error('No customer email for reminder:', reminder.id)
      return
    }

    const dueDate = new Date(invoice.due_date).toLocaleDateString()
    const subject = `Payment Reminder: Invoice ${invoice.invoice_number}`
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#1a1a1a">Payment Reminder</h2>
      <p>Dear ${invoice.customer_name || 'Customer'},</p>
      <p>This is a reminder that invoice <strong>${invoice.invoice_number}</strong> for <strong>$${invoice.amount}</strong> was due on <strong>${dueDate}</strong>.</p>
      <p>Please arrange payment at your earliest convenience.</p>
    </div>`

    try {
      const { error: fnError } = await supabase.functions.invoke('send_reminder_email', {
        body: { to: invoice.customer_email, subject, html }
      })
      if (fnError) throw fnError
      await updateReminder(reminder.id, { status: 'sent', sent_at: new Date().toISOString() })
    } catch (err) {
      console.error('Failed to send reminder:', err)
      await updateReminder(reminder.id, { status: 'failed' })
    }
  }

  useEffect(() => {
    handleLoadTemplate()
  }, [activeTmpl])

  const templateButtons = [
    { key: '3_days_before', label: '3 days before', icon: 'clock', desc: 'Friendly early reminder' },
    { key: 'on_due_date', label: 'On due date', icon: 'calendar', desc: 'Payment due today' },
    { key: '7_days_overdue', label: '7 days overdue', icon: 'warning', desc: 'Urgent follow-up' },
    { key: '14_days_overdue', label: '14 days overdue', icon: 'alert', desc: 'Final notice' },
  ]

  const icons = {
    clock: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-neutral-900 tracking-tight">Reminders</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Automated email schedule & activity log</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: reminders.length, color: 'bg-neutral-900 text-white' },
          { label: 'Pending', value: reminders.filter(r => r.status === 'pending').length, color: 'bg-amber-50 text-amber-700 border border-amber-200' },
          { label: 'Sent', value: reminders.filter(r => r.status === 'sent').length, color: 'bg-neutral-100 text-neutral-700 border border-neutral-200' },
          { label: 'Failed', value: reminders.filter(r => r.status === 'failed').length, color: 'bg-red-50 text-red-700 border border-red-200' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-3 ${stat.color}`}>
            <div className="text-xs font-medium opacity-70">{stat.label}</div>
            <div className="font-display font-bold text-lg mt-0.5">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 mb-5 w-fit">
        <button
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'log' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          onClick={() => setActiveTab('log')}
        >
          Activity Log
        </button>
        <button
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'templates' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          onClick={() => setActiveTab('templates')}
        >
          Email Templates
        </button>
      </div>

      {/* Activity Log Tab */}
      {activeTab === 'log' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50/50">
            <span className="font-semibold text-sm text-neutral-900">Reminder log</span>
            <span className="text-xs text-neutral-500">{reminders.length} entries</span>
          </div>
          {reminders.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls[reminder.status] || dotCls.pending}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900">{reminder.type}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {reminder.invoices?.invoice_number || 'N/A'} · {reminder.invoices?.customer_name || 'N/A'} · {fmtDate(reminder.scheduled_at)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${bCls[reminder.status] || bCls.pending}`}>
                    {reminder.status}
                  </span>
                  {reminder.status === 'pending' && (
                    <button
                      onClick={() => handleSendReminder(reminder)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                    >
                      Send
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-neutral-400 fill-none stroke-2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-900">No reminders yet</p>
              <p className="text-xs text-neutral-500 mt-0.5">Reminders will appear here when scheduled</p>
            </div>
          )}
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex items-start gap-2 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg mb-4 text-xs text-neutral-700">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-600 fill-none stroke-2 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Use variables: <code className="bg-white px-1.5 py-0.5 rounded text-[10px] font-mono">{'{{invoice_number}}'}</code> <code className="bg-white px-1.5 py-0.5 rounded text-[10px] font-mono">{'{{customer_name}}'}</code> <code className="bg-white px-1.5 py-0.5 rounded text-[10px] font-mono">{'{{amount}}'}</code> <code className="bg-white px-1.5 py-0.5 rounded text-[10px] font-mono">{'{{due_date}}'}</code></span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Template Sidebar */}
            <div className="flex flex-col gap-1.5 sm:min-w-[180px]">
              {templateButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => { setActiveTmpl(btn.key); handleLoadTemplate() }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-all ${activeTmpl === btn.key ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}
                >
                  {icons[btn.icon]}
                  <div>
                    <div>{btn.label}</div>
                    <div className={`text-[10px] ${activeTmpl === btn.key ? 'text-neutral-100' : 'text-neutral-400'}`}>{btn.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Template Body */}
            <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
              <div className="mb-4">
                <Input
                  label="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Body</label>
                <textarea
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-lg bg-white text-neutral-900 text-xs outline-none font-sans transition-all focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/20 h-40 resize-y leading-relaxed"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSaveTemplate} className="text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 border-neutral-900">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none stroke-2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                  </svg>
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

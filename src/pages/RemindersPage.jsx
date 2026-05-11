import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Input from '../components/Input'

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

  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const dotCls = {
    sent: 'bg-green-500',
    pending: 'bg-amber-500',
    failed: 'bg-red-500',
    skipped: 'bg-slate-400',
  }

  const bCls = {
    sent: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-slate-100 text-slate-400',
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

  const handleSendReminder = async (reminderId) => {
    const { error } = await updateReminder(reminderId, { status: 'sent', sent_at: new Date().toISOString() })
    if (error) {
      console.error('Failed to send reminder:', error)
    }
  }

  useEffect(() => {
    handleLoadTemplate()
  }, [activeTmpl])

  const templateButtons = [
    { key: '3_days_before', label: '3 days before', icon: 'clock' },
    { key: 'on_due_date', label: 'On due date', icon: 'calendar' },
    { key: '7_days_overdue', label: '7 days overdue', icon: 'warning' },
    { key: '14_days_overdue', label: '14 days overdue', icon: 'alert' },
  ]

  const icons = {
    clock: (
      <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-7 gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] text-slate-900">Reminders</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Automated email schedule & activity log</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.75 mb-5.5 w-fit">
        <button
          className={`px-4 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all ${activeTab === 'log' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          onClick={() => setActiveTab('log')}
        >
          Activity Log
        </button>
        <button
          className={`px-4 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          onClick={() => setActiveTab('templates')}
        >
          Email Templates
        </button>
      </div>

      {/* Activity Log Tab */}
      {activeTab === 'log' && (
        <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
            <span className="font-display font-semibold text-[14px] text-slate-900">Reminder log</span>
            <span className="text-[12px] text-slate-500">{reminders.length} entries</span>
          </div>
          {reminders.length > 0 ? (
            reminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-3.5 px-5 py-3.25 border-b border-slate-200 last:border-b-0">
                <div className={`w-2.25 h-2.25 rounded-full flex-shrink-0 ${dotCls[reminder.status] || dotCls.pending}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px]">{reminder.type}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    {reminder.invoices?.invoice_number || 'N/A'} · {reminder.invoices?.customers?.name || 'N/A'} · {fmtDate(reminder.scheduled_at)}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold ${bCls[reminder.status] || bCls.pending}`}>
                  {reminder.status}
                </span>
                {reminder.status === 'pending' && (
                  <button
                    onClick={() => handleSendReminder(reminder.id)}
                    className="px-2.75 py-1 rounded-md text-[12px] font-medium cursor-pointer border-none transition-all bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    Send now
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-13 text-center">
              <div className="w-11 h-11 rounded-[11px] bg-slate-100 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-400 fill-none stroke-1.5">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <p className="font-medium">No reminders yet</p>
            </div>
          )}
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex items-start gap-3.5 px-4 py-3 bg-green-50 border border-green-200 rounded-lg mb-4.5 text-[12.5px] text-green-700">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-green-600 fill-none stroke-2 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Variables: <code className="bg-white px-1 py-0.5 rounded text-[11.5px] font-mono">{'{{invoice_number}}'}</code> <code className="bg-white px-1 py-0.5 rounded text-[11.5px] font-mono">{'{{customer_name}}'}</code> <code className="bg-white px-1 py-0.5 rounded text-[11.5px] font-mono">{'{{amount}}'}</code> <code className="bg-white px-1 py-0.5 rounded text-[11.5px] font-mono">{'{{currency}}'}</code> <code className="bg-white px-1 py-0.5 rounded text-[11.5px] font-mono">{'{{due_date}}'}</code> <code className="bg-white px-1 py-0.5 rounded text-[11.5px] font-mono">{'{{company_name}}'}</code></span>
          </div>

          <div className="flex gap-4">
            {/* Template Sidebar */}
            <div className="flex flex-col gap-1 min-w-[200px]">
              {templateButtons.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => { setActiveTmpl(btn.key); handleLoadTemplate() }}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer text-left border transition-all ${activeTmpl === btn.key ? 'bg-green-600 text-white border-green-600' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'}`}
                >
                  {icons[btn.icon]}
                  {btn.label}
                  <span className="w-1.75 h-1.75 rounded-full bg-green-500 ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Template Body */}
            <div className="flex-1 bg-white border border-slate-200 rounded-[10px] p-5 mb-0">
              <div className="mb-4">
                <Input
                  label="Email Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] mb-1.5">Email Body</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm outline-none font-sans transition-border duration-150 focus:border-green-500 focus:shadow-[0_0_0_2px_rgba(34,197,94,0.12)] h-48 resize-vertical leading-relaxed text-[12.5px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSaveTemplate}>
                  <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
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

import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Input from '../components/Input'
import { signOut } from '../lib/supabase'

export default function SettingsPage() {
  const { settings, setSettings, user, logout, loadProfile, updateProfile } = useStore()
  const [formData, setFormData] = useState({
    full_name: settings.full_name || '',
    company_name: settings.company_name || '',
    email: settings.email || user?.email || '',
  })
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (user) {
      loadProfile(user.id)
    }
  }, [user])

  const handleSave = async () => {
    const { error } = await updateProfile(user.id, formData)
    if (error) {
      setToast({ message: 'Failed to save settings', type: 'error' })
    } else {
      setToast({ message: 'Settings saved', type: 'success' })
    }
  }

  const handleLogout = async () => {
    await signOut()
    logout()
  }

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className="fixed top-[18px] right-[18px] bg-green-600 text-white px-[18px_11px] py-[11px_18px] rounded-lg text-sm font-medium z-[999] flex items-center gap-2.5 animate-fade-in shadow-lg">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast.message}
        </div>
      )}

      <div className="flex items-start justify-between mb-7 gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] text-slate-900">Settings</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">Manage your account and preferences</p>
        </div>
      </div>

      <div style={{ maxWidth: '560px' }}>
        {/* Profile Section */}
        <div className="bg-white border border-slate-200 rounded-[10px] p-[22px] mb-4">
          <div className="font-display font-semibold text-[14px] mb-4.5">Profile</div>
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
          <Input
            label="Company Name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled
          />
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="bg-white border border-slate-200 rounded-[10px] p-[22px] mb-4">
          <div className="font-display font-semibold text-[14px] mb-2">Email Configuration</div>
          <p className="text-[13px] text-slate-500 mb-3.5">Emails are sent via Resend. Configure your environment variables before deploying.</p>
          <div className="p-3.5 bg-slate-100 rounded-lg border border-slate-200 font-mono text-[12px] text-slate-500 leading-relaxed">
            RESEND_API_KEY=re_...<br />
            RESEND_FROM_EMAIL=noreply@yourdomain.com<br />
            CRON_SECRET=your_random_secret<br />
            NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co<br />
            NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white border border-red-200 rounded-[10px] p-[22px]">
          <div className="font-display font-semibold text-[14px] mb-2 text-red-600">Danger Zone</div>
          <p className="text-[13px] text-slate-500 mb-3.5">Once you log out, you'll need to sign in again.</p>
          <Button variant="danger" onClick={handleLogout}>Sign Out</Button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { signOut, supabase } from '../lib/supabase'
import { CURRENCIES } from '../utils/currency'

export default function SettingsPage() {
  const { settings, setSettings, user, logout, loadProfile, updateProfile, userPlan } = useStore()
  const [formData, setFormData] = useState({
    full_name: settings.full_name || '',
    company_name: settings.company_name || '',
    email: settings.email || user?.email || '',
    phone: '',
    business_contact: '',
    address: '',
    default_currency: settings.default_currency || 'USD',
  })
  const [prefs, setPrefs] = useState({
    theme: settings.theme || 'system',
    notifications: settings.notifications !== false,
    newsletter: false,
  })
  const [apiKeys, setApiKeys] = useState([
    { id: 'demo-1', name: 'Production Key', key: 'ic_live_••••••••••••••••', created: '2024-01-15' },
  ])
  const [newKeyName, setNewKeyName] = useState('')
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [pwdData, setPwdData] = useState({ current: '', new: '', confirm: '' })
  const [sessions] = useState([
    { device: 'Chrome on Windows', location: 'Harare, ZW', current: true },
  ])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (user) {
      loadProfile(user.id)
    }
  }, [user?.id])

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      full_name: settings.full_name || '',
      company_name: settings.company_name || '',
      email: settings.email || user?.email || '',
      default_currency: settings.default_currency || 'USD',
    }))
  }, [settings, user])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveProfile = async () => {
    const { error } = await updateProfile(user.id, {
      full_name: formData.full_name,
      company_name: formData.company_name,
      phone: formData.phone,
      default_currency: formData.default_currency,
    })
    if (error) showToast('Failed to save profile', 'error')
    else showToast('Profile saved')
  }

  const handleSavePrefs = () => {
    setSettings({ ...settings, ...prefs })
    showToast('Preferences saved')
  }

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return
    const key = { id: Math.random().toString(36).slice(2), name: newKeyName, key: 'ic_live_' + Math.random().toString(36).slice(2, 18), created: new Date().toISOString().split('T')[0] }
    setApiKeys([...apiKeys, key])
    setNewKeyName('')
    showToast('API key created (demo)')
  }

  const handleDeleteKey = (id) => {
    setApiKeys(apiKeys.filter(k => k.id !== id))
    showToast('API key removed')
  }

  const handleChangePassword = async () => {
    if (pwdData.new !== pwdData.confirm) {
      showToast('Passwords do not match', 'error')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: pwdData.new })
    if (error) showToast(error.message, 'error')
    else {
      setPwdData({ current: '', new: '', confirm: '' })
      setShowPwdForm(false)
      showToast('Password updated')
    }
  }

  const handleLogout = async () => {
    await signOut()
    logout()
  }

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-xs font-medium z-50 animate-fade-in ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'}`}>
          {toast.message}
        </div>
      )}

      <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Settings</h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">Manage your account, preferences and security</p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Profile Settings */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Profile</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Full Name</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Company Name</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Email</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 outline-none cursor-not-allowed" value={formData.email} disabled />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Phone</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+263..." />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Business Contact</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.business_contact} onChange={e => setFormData({...formData, business_contact: e.target.value})} placeholder="Alt contact / email" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Default Currency</label>
                <select className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.default_currency} onChange={e => setFormData({...formData, default_currency: e.target.value})}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Address</label>
                <textarea className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none resize-none" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Business address" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveProfile} className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Save Changes</button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Preferences</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">Theme</div>
                  <div className="text-[10px] text-neutral-500">Choose your preferred appearance</div>
                </div>
                <select className="text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white px-2 py-1 outline-none" value={prefs.theme} onChange={e => setPrefs({...prefs, theme: e.target.value})}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">Email Notifications</div>
                  <div className="text-[10px] text-neutral-500">Receive reminders and updates via email</div>
                </div>
                <button onClick={() => setPrefs({...prefs, notifications: !prefs.notifications})} className={`w-9 h-5 rounded-full transition-colors relative ${prefs.notifications ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.notifications ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">Newsletter</div>
                  <div className="text-[10px] text-neutral-500">Product tips and feature updates</div>
                </div>
                <button onClick={() => setPrefs({...prefs, newsletter: !prefs.newsletter})} className={`w-9 h-5 rounded-full transition-colors relative ${prefs.newsletter ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.newsletter ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={handleSavePrefs} className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Save Preferences</button>
            </div>
          </div>

          {/* Account */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1 text-neutral-900 dark:text-white">Account</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">Sign out from all devices.</p>
            <button onClick={handleLogout} className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Sign Out</button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Security */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Security</div>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-neutral-900 dark:text-white">Change Password</div>
                <div className="text-[10px] text-neutral-500 mb-2">Update your account password securely</div>
                {!showPwdForm ? (
                  <button onClick={() => setShowPwdForm(true)} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Change Password</button>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <input type="password" className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Current password" value={pwdData.current} onChange={e => setPwdData({...pwdData, current: e.target.value})} />
                    <input type="password" className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="New password" value={pwdData.new} onChange={e => setPwdData({...pwdData, new: e.target.value})} />
                    <input type="password" className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Confirm new password" value={pwdData.confirm} onChange={e => setPwdData({...pwdData, confirm: e.target.value})} />
                    <div className="flex gap-2">
                      <button onClick={handleChangePassword} className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Update</button>
                      <button onClick={() => setShowPwdForm(false)} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <div className="text-xs font-medium text-neutral-900 dark:text-white mb-2">Active Sessions</div>
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2">
                    <div className="text-xs text-neutral-700 dark:text-neutral-300">{s.device} <span className="text-neutral-400">· {s.location}</span></div>
                    {s.current ? <span className="text-[10px] font-medium text-green-600">Current</span> : <button className="text-[10px] text-red-600 hover:underline">Revoke</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-1 text-neutral-900 dark:text-white">API Keys</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">Manage API access (backend integration coming soon)</p>
            <div className="space-y-2 mb-3">
              {apiKeys.map(k => (
                <div key={k.id} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs font-medium text-neutral-900 dark:text-white">{k.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{k.key}</div>
                  </div>
                  <button onClick={() => handleDeleteKey(k.id)} className="text-[10px] text-red-600 hover:underline">Remove</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Key name (e.g. Production)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
              <button onClick={handleCreateKey} className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Generate Key</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

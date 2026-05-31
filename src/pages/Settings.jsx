import React, { useState } from 'react'
import { Users, GraduationCap, Lock } from 'lucide-react'
import { UserManagement } from '../components/admin/UserManagement'
import { PromotionWizard } from '../components/admin/PromotionWizard'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export default function Settings() {
  const { role } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('password')
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  const isAdmin     = role === 'ADMIN'
  const isPrincipal = role === 'PRINCIPAL'

  const tabs = [
    { id: 'users',     label: 'User Management',   icon: Users,         show: isAdmin },
    { id: 'promotion', label: 'Year Promotion',     icon: GraduationCap, show: isAdmin || isPrincipal },
    { id: 'password',  label: 'Change Password',    icon: Lock,          show: true },
  ].filter(t => t.show)

  // Default to first available tab on mount
  const activeTabId = tabs.find(t => t.id === activeTab)?.id ?? tabs[0]?.id

  const handlePwChange = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.next.length < 8)         { toast.error('Password must be at least 8 characters'); return }
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      toast.success('Password changed!')
      setPwForm({ next: '', confirm: '' })
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1a3a5c]">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">System administration and account settings</p>
      </div>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <div className="w-48 shrink-0">
          <nav className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                  activeTabId === tab.id
                    ? 'bg-[#1a3a5c]/5 text-[#1a3a5c] border-[#1a3a5c]'
                    : 'text-gray-600 hover:bg-gray-50 border-transparent'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeTabId === 'users' && <UserManagement />}

          {activeTabId === 'promotion' && (
            <div>
              <h3 className="font-semibold text-[#1a3a5c] mb-1">Year-End Student Promotion</h3>
              <p className="text-sm text-gray-500 mb-5">Promote all students to the next class at the end of the academic year.</p>
              <PromotionWizard onDone={() => setActiveTab('password')} />
            </div>
          )}

          {activeTabId === 'password' && (
            <div className="max-w-sm">
              <h3 className="font-semibold text-[#1a3a5c] mb-4">Change Password</h3>
              <form onSubmit={handlePwChange} className="space-y-4">
                {[['next', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input
                      type="password"
                      value={pwForm[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      minLength={8}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
                      required
                    />
                  </div>
                ))}
                <Button type="submit" variant="primary" loading={pwLoading} className="w-full">
                  Update Password
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

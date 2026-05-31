import React, { useState, useEffect } from 'react'
import { Plus, ShieldCheck, User } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { HOUSES } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import { supabase } from '../../lib/supabase'

const ROLE_LABELS = {
  ADMIN:      'Admin',
  PRINCIPAL:  'Principal',
  HM:         'House Master',
  GATE_GUARD: 'Gate Guard',
}

export function UserManagement() {
  const { currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'HM', assigned_house_ids: [] })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name } },
      })
      if (authErr) throw authErr

      if (authData?.user) {
        const now = new Date().toISOString()
        const { error: staffErr } = await supabase.from('staff').insert({
          id:                authData.user.id,
          name:              form.name,
          role:              form.role,
          assigned_house_ids: form.role === 'HM' ? (form.assigned_house_ids.length ? form.assigned_house_ids : []) : [],
          created_at:        now,
          updated_at:        now,
          dirty:             false,
          synced_at:         now,
        })
        if (staffErr) throw staffErr
      }

      toast.success('User created! They will receive a confirmation email.')
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', role: 'HM', assigned_house_ids: [] })
      load()
    } catch (err) {
      toast.error('Failed to create user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20 focus:border-[#1a3a5c]'

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-[#1a3a5c]">System Users</h3>
        <Button size="sm" variant="primary" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
          Add User
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="font-medium text-sm text-gray-700">New Staff User</h4>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Full Name" value={form.name}
              onChange={e => update('name', e.target.value)} className={inputCls} required />
            <input type="email" placeholder="Email" value={form.email}
              onChange={e => update('email', e.target.value)} className={inputCls} required />
            <input type="password" placeholder="Password (min 8 chars)" value={form.password}
              onChange={e => update('password', e.target.value)} className={inputCls} required minLength={8} />
            <select value={form.role} onChange={e => update('role', e.target.value)} className={inputCls}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {form.role === 'HM' && (
              <select
                value={form.assigned_house_ids[0] || ''}
                onChange={e => update('assigned_house_ids', e.target.value ? [e.target.value] : [])}
                className={inputCls}
              >
                <option value="">-- Assign House --</option>
                {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" loading={saving}>Create User</Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {loading ? <p className="text-gray-400 text-sm py-4 text-center">Loading…</p> : (
          users.map(u => {
            const assignedHouse = u.assigned_house_ids?.[0]
              ? HOUSES.find(h => h.id === u.assigned_house_ids[0])
              : null
            return (
              <div key={u.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.id === currentUser?.id ? '(You)' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {assignedHouse && <Badge variant="default">{assignedHouse.name}</Badge>}
                  <span className="text-xs bg-[#1a3a5c]/10 text-[#1a3a5c] px-2 py-0.5 rounded-full font-medium">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </div>
              </div>
            )
          })
        )}
        {!loading && users.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No staff users found.</p>
        )}
      </div>
    </div>
  )
}

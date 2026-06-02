import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'

export default function Settings() {
  const { user, signOut } = useAuth()

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">User profile, school configuration and admin controls</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Account</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{user?.full_name ?? 'Unknown user'}</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{user?.email ?? '—'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Role</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{user?.role.replace('_', ' ') ?? '—'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned houses</p>
            <p className="mt-2 text-sm text-slate-700">
              {user?.assigned_house_ids?.length
                ? user.assigned_house_ids.join(', ')
                : 'All houses'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Security</p>
            <p className="mt-2 text-sm text-slate-600">This app uses Supabase authentication and local PWA caching for offline access. Device registration and role enforcement are enforced at login.</p>
          </div>

          <div className="flex justify-end">
            <Button variant="danger" onClick={signOut}>Sign out</Button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">School settings</p>
            <p className="mt-4 text-sm text-slate-600">Configure academic year, hostel mappings and leave rules in the Admin Portal once the web dashboard is available.</p>
          </div>

          <div className="card p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Offline sync</p>
            <p className="mt-4 text-sm text-slate-600">The app caches page resources and will continue to work when the network is unavailable. Data sync is handled on reconnect.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

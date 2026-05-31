import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function Unauthorized() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX size={32} className="text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 text-sm mb-6">
          You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
        </p>
        <Link to="/">
          <Button variant="secondary">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

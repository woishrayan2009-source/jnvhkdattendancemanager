import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Download, FileText, Layers, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getDailyAttendanceCounts, getTodaysLeaveSummary } from '@/services/reports'
import { ATTENDANCE_STATUSES } from '@/constants/sessions'

export default function Reports() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [leaveSummary, setLeaveSummary] = useState({ activeLeaves: 0, overdueLeaves: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const today = format(new Date(), 'yyyy-MM-dd')
        const [attendance, leaves] = await Promise.all([
          getDailyAttendanceCounts(today),
          getTodaysLeaveSummary(today),
        ])
        setCounts(attendance)
        setLeaveSummary(leaves)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load report summary')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleDownload = () => {
    const rows = [
      ['Report', 'Count'],
      ...ATTENDANCE_STATUSES.map((status) => [status.label, String(counts[status.id] ?? 0)]),
      ['Active leaves', String(leaveSummary.activeLeaves)],
      ['Overdue returns', String(leaveSummary.overdueLeaves)],
    ]
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jnv-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">School-wide attendance, leave and export summaries</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Daily summary</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">{format(new Date(), 'dd MMM yyyy')}</h2>
            </div>
            <Button leftIcon={<Download size={16} />} onClick={handleDownload}>
              Export CSV
            </Button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ATTENDANCE_STATUSES.map((status) => (
              <div key={status.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">{status.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{counts[status.id] ?? 0}</p>
              </div>
            ))}
            <div className="rounded-3xl border border-slate-200 bg-amber-50 p-5">
              <p className="text-sm text-slate-500">Active leaves</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{leaveSummary.activeLeaves}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-red-50 p-5">
              <p className="text-sm text-slate-500">Overdue returns</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{leaveSummary.overdueLeaves}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-3 text-slate-700">
              <BarChart3 size={22} />
              <div>
                <p className="text-sm font-semibold">Report export</p>
                <p className="text-sm text-slate-500">Download the current summary as CSV for inspection or offline sharing.</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 text-slate-700">
              <FileText size={22} />
              <div>
                <p className="text-sm font-semibold">Report types planned</p>
                <p className="mt-2 text-sm text-slate-500">Daily absentee, monthly attendance, leave summary, long absence and overdue return reports.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

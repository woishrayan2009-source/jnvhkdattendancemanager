import React, { useState, useEffect } from 'react'
import { QrCode, Printer, RefreshCw } from 'lucide-react'
import { fetchStudents } from '../services/students'
import { generateQRCardsPDF } from '../services/reports'
import { Button } from '../components/ui/Button'
import { HOUSES } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import QRCode from 'qrcode'

export default function QRCards() {
  const toast = useToast()
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [houseFilter, setHouseFilter] = useState('')
  const [generating, setGenerating]   = useState(false)
  const [qrPreviews, setQrPreviews]   = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchStudents({ houseId: houseFilter || null })
      setStudents(data)

      // Generate QR previews for first 20
      const previews = {}
      for (const s of data.slice(0, 20)) {
        previews[s.id] = await QRCode.toDataURL(s.qr_token, {
          width: 80,
          margin: 0,
          color: { dark: '#1a3a5c', light: '#ffffff' },
        })
      }
      setQrPreviews(previews)
    } catch (err) {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [houseFilter])

  const handlePrint = async () => {
    setGenerating(true)
    try {
      const doc = await generateQRCardsPDF(students)
      doc.save(`qr-cards-${houseFilter ? HOUSES.find(h=>h.id===houseFilter)?.name : 'all'}.pdf`)
      toast.success(`PDF generated with ${students.length} QR cards!`)
    } catch (err) {
      toast.error('PDF generation failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a3a5c]">QR ID Cards</h2>
          <p className="text-sm text-gray-500 mt-0.5">Generate printable A4 sheets with student QR codes</p>
        </div>
        <Button
          id="print-qr-btn"
          variant="gold"
          leftIcon={<Printer size={15} />}
          onClick={handlePrint}
          loading={generating}
          disabled={students.length === 0}
        >
          Print PDF ({students.length})
        </Button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex gap-3">
        <select
          value={houseFilter}
          onChange={e => setHouseFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
        >
          <option value="">All Houses</option>
          {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <p className="text-sm text-gray-500 self-center">{students.length} students selected</p>
      </div>

      {/* Preview grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-[#1a3a5c]" size={24} /></div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">Showing first 20 previews. PDF will include all {students.length} students.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {students.slice(0, 20).map(student => (
                <div key={student.id} className="border border-gray-200 rounded-xl overflow-hidden text-center shadow-sm">
                  <div className="bg-[#1a3a5c] py-2">
                    <p className="text-white text-xs font-bold">JNV HKD</p>
                  </div>
                  <div className="p-3">
                    {qrPreviews[student.id] ? (
                      <img src={qrPreviews[student.id]} alt="QR" className="w-16 h-16 mx-auto" />
                    ) : (
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded flex items-center justify-center">
                        <QrCode size={24} className="text-gray-300" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-700 mt-2 truncate">{student.name}</p>
                    <p className="text-xs text-gray-400">{student.roll_number}</p>
                    <p className="text-xs text-gray-400">{student.houses?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

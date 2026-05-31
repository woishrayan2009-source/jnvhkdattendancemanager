import React, { useState } from 'react'
import { FileText, Table2, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { generateDailyAttendancePDF, exportAttendanceCSV } from '../../services/reports'
import { useToast } from '../ui/Toast'

export function ExportButtons({ date, houseId, sessionType }) {
  const toast = useToast()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)

  const handlePDF = async () => {
    setPdfLoading(true)
    try {
      const doc = await generateDailyAttendancePDF({ date, houseId, sessionType })
      doc.save(`attendance_${date}_${sessionType || 'all'}.pdf`)
      toast.success('PDF downloaded!')
    } catch (err) {
      toast.error('PDF generation failed: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleCSV = async () => {
    setCsvLoading(true)
    try {
      await exportAttendanceCSV({ date, houseId, sessionType })
      toast.success('CSV downloaded!')
    } catch (err) {
      toast.error('CSV export failed: ' + err.message)
    } finally {
      setCsvLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="sm"
        leftIcon={<FileText size={14} />}
        onClick={handlePDF}
        loading={pdfLoading}
      >
        PDF
      </Button>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Table2 size={14} />}
        onClick={handleCSV}
        loading={csvLoading}
      >
        CSV
      </Button>
    </div>
  )
}

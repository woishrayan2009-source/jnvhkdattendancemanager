import React, { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { getStudentByQR } from '../../services/students'
import { useToast } from '../ui/Toast'
import { useAttendanceStore } from '../../store/attendanceStore'

export function QRScanner({ onStudentScanned, onClose }) {
  const scannerRef = useRef(null)
  const [scannerInstance, setScannerInstance] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)
  const toast = useToast()
  const store = useAttendanceStore()

  useEffect(() => {
    let scanner
    const startScanner = async () => {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      scanner.render(
        async (decodedText) => {
          if (decodedText === lastScanned) return
          setLastScanned(decodedText)
          try {
            const student = await getStudentByQR(decodedText)
            if (!student) { toast.error('Student not found for this QR'); return }
            // Mark as present
            store.markStudent(student.id, 'present')
            toast.success(`✓ ${student.name} — marked Present`)
            onStudentScanned?.(student)
            setTimeout(() => setLastScanned(null), 2000)
          } catch (err) {
            toast.error('QR scan error: ' + err.message)
          }
        },
        (err) => { /* scan errors are normal */ }
      )
      setScannerInstance(scanner)
    }
    startScanner()
    return () => { scanner?.clear?.() }
  }, [])

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-[#1a3a5c]" />
          <h3 className="font-semibold text-[#1a3a5c]">QR Code Scanner</h3>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      <div id="qr-reader" className="rounded-xl overflow-hidden" />

      {lastScanned && (
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700">
          ✓ Scanned successfully
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-3">
        Point camera at student's QR code to mark Present
      </p>
    </div>
  )
}

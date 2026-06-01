import React, { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { getStudentByQR } from '../../services/students'
import { useToast } from '../ui/Toast'
import { useAttendanceStore } from '../../store/attendanceStore'

export function QRScanner({ onStudentScanned, onClose }) {
  const scannerRef = useRef(null)
  /**
   * Use a ref instead of state for lastScanned.
   *
   * Bug: scanner.render() captures the closure at effect-mount time.
   * setState updates React state but the scanner callback NEVER sees the
   * new value — the stale `lastScanned === null` check always passes,
   * so every re-scan of the same code fires multiple times.
   *
   * Fix: useRef — the callback reads .current directly, always fresh.
   */
  const lastScannedRef = useRef(null)
  const [lastScannedDisplay, setLastScannedDisplay] = useState(null) // UI only
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
          // Guard against duplicate scans — ref always has fresh value
          if (decodedText === lastScannedRef.current) return
          lastScannedRef.current = decodedText
          setLastScannedDisplay(decodedText) // trigger UI update only
          try {
            const student = await getStudentByQR(decodedText)
            if (!student) { toast.error('Student not found for this QR'); return }
            store.markStudent(student.id, 'present')
            toast.success(`✓ ${student.name} — marked Present`)
            onStudentScanned?.(student)
            // Allow re-scan after 2 seconds
            setTimeout(() => {
              lastScannedRef.current = null
              setLastScannedDisplay(null)
            }, 2000)
          } catch (err) {
            toast.error('QR scan error: ' + err.message)
            lastScannedRef.current = null
            setLastScannedDisplay(null)
          }
        },
        (_err) => { /* scan frame errors are normal — ignore */ }
      )
      scannerRef.current = scanner
    }
    startScanner()
    return () => { scanner?.clear?.() }
  }, []) // empty deps — refs never cause stale closures

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

      {lastScannedDisplay && (
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

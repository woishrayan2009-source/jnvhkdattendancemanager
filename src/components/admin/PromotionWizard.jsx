import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { promoteStudents } from '../../services/students'
import { useToast } from '../ui/Toast'

export function PromotionWizard({ onDone }) {
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const handlePromote = async () => {
    if (!confirmed) { toast.error('Please tick the confirmation checkbox'); return }
    setLoading(true)
    try {
      const res = await promoteStudents(academicYear)
      setResult(res)
      setStep(3)
      toast.success(`Promotion complete! ${res.promoted} promoted, ${res.alumni} passed out.`)
    } catch (err) {
      toast.error('Promotion failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      {/* Step 1: Select year */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-semibold text-amber-800">Year-End Promotion</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This will promote all active students to the next class. Class 12 students will be marked as alumni.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Academic Year (graduating class of)
            </label>
            <input
              type="number"
              value={academicYear}
              onChange={e => setAcademicYear(parseInt(e.target.value, 10))}
              min={2020}
              max={2035}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/20"
            />
            <p className="text-xs text-gray-400 mt-1">e.g. 2025 for the 2024–25 academic year</p>
          </div>

          <Button variant="primary" onClick={() => setStep(2)} className="w-full">
            Continue <ArrowRight size={15} className="ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-[#1a3a5c]">Confirm Promotion for {academicYear - 1}–{academicYear}</h4>

          <ul className="text-sm text-gray-600 space-y-2 bg-gray-50 rounded-xl p-4">
            <li>✅ Class 6 → Class 7</li>
            <li>✅ Class 7 → Class 8</li>
            <li>✅ Class 8 → Class 9</li>
            <li>✅ Class 9 → Class 10</li>
            <li>✅ Class 10 → Class 11 Science <span className="text-gray-400">(admin can reassign section)</span></li>
            <li>✅ Class 11 → Class 12</li>
            <li>🎓 Class 12 → Alumni ({academicYear})</li>
          </ul>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#1a3a5c]"
            />
            <span className="text-sm text-gray-700">
              I understand this is <strong>irreversible</strong> and have verified the student data is correct for academic year {academicYear - 1}–{academicYear}.
            </span>
          </label>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button
              variant="danger"
              onClick={handlePromote}
              loading={loading}
              disabled={!confirmed}
              className="flex-1"
            >
              Promote All Students
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && result && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="text-emerald-600" size={32} />
          </div>
          <h4 className="font-semibold text-[#1a3a5c]">Promotion Complete!</h4>
          <p className="text-sm text-gray-500">Academic year {academicYear - 1}–{academicYear}</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-emerald-600">{result.promoted}</p>
              <p className="text-xs text-gray-600 mt-1">Students Promoted</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-amber-600">{result.alumni}</p>
              <p className="text-xs text-gray-600 mt-1">Passed Out (Alumni)</p>
            </div>
          </div>
          <Button variant="primary" onClick={onDone} className="w-full">Done</Button>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { LeaveForm } from '../components/leaves/LeaveForm'
import { LeaveList } from '../components/leaves/LeaveList'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

export default function Leaves() {
  const [showForm, setShowForm] = useState(false)
  const [refresh,  setRefresh]  = useState(0)

  const handleSuccess = () => {
    setShowForm(false)
    setRefresh(r => r + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a3a5c]">Leave Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Record and track student leaves</p>
        </div>
        <Button
          id="record-leave-btn"
          variant="primary"
          leftIcon={<Plus size={15} />}
          onClick={() => setShowForm(true)}
        >
          Record Leave
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <LeaveList refresh={refresh} />
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Record Student Leave"
      >
        <LeaveForm onSuccess={handleSuccess} />
      </Modal>
    </div>
  )
}

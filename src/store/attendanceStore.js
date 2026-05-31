import { create } from 'zustand'

export const useAttendanceStore = create((set, get) => ({
  // Current session being marked
  activeSession: null,
  activeRecords: {},  // { studentId: { status, leave_type, remarks } }
  students: [],       // students for current session
  isSubmitting: false,
  isDirty: false,

  setActiveSession: (session) => set({ activeSession: session }),
  setStudents: (students) => set({ students }),
  setIsSubmitting: (v) => set({ isSubmitting: v }),

  initRecords: (students, existingRecords = []) => {
    const records = {}
    students.forEach(s => {
      const existing = existingRecords.find(r => r.student_id === s.id)
      records[s.id] = existing
        ? { status: existing.status, leave_type: existing.leave_type, remarks: existing.remarks }
        : { status: 'present', leave_type: null, remarks: '' }
    })
    set({ activeRecords: records, isDirty: false })
  },

  markStudent: (studentId, status, leaveType = null, remarks = '') => {
    set(state => ({
      activeRecords: {
        ...state.activeRecords,
        [studentId]: { status, leave_type: leaveType, remarks },
      },
      isDirty: true,
    }))
  },

  getRecord: (studentId) => get().activeRecords[studentId] || { status: 'present', leave_type: null, remarks: '' },

  getSummary: () => {
    const records = Object.values(get().activeRecords)
    return {
      total:   records.length,
      present: records.filter(r => r.status === 'present').length,
      absent:  records.filter(r => r.status === 'absent').length,
      leave:   records.filter(r => r.status === 'leave').length,
    }
  },

  reset: () => set({ activeSession: null, activeRecords: {}, students: [], isDirty: false }),
}))

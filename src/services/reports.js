import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'
import { format } from 'date-fns'
import { getAttendanceReport } from './attendance'
import { getLeaves } from './leaves'

const NVS_NAVY = [26, 58, 92]   // #1a3a5c in RGB
const NVS_GOLD = [217, 119, 6]  // #d97706 in RGB

function createPDFHeader(doc, title, subtitle) {
  // Header band
  doc.setFillColor(...NVS_NAVY)
  doc.rect(0, 0, 210, 28, 'F')

  // School name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Jawahar Navodaya Vidyalaya, Haridwar', 105, 11, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 105, 18, { align: 'center' })

  // Gold line
  doc.setFillColor(...NVS_GOLD)
  doc.rect(0, 28, 210, 1.5, 'F')

  // Subtitle below header
  doc.setTextColor(...NVS_NAVY)
  doc.setFontSize(9)
  doc.text(subtitle, 105, 34, { align: 'center' })
}

export async function generateDailyAttendancePDF({ date, houseId, sessionType }) {
  const fromDate = date
  const toDate   = date
  const records  = await getAttendanceReport({ houseId, fromDate, toDate, sessionType })

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const sessionLabel = sessionType
    ? sessionType.charAt(0).toUpperCase() + sessionType.slice(1)
    : 'All Sessions'
  const formattedDate = format(new Date(date), 'dd MMMM yyyy')

  createPDFHeader(
    doc,
    `Daily Attendance Report — ${sessionLabel} Session`,
    `Date: ${formattedDate}   |   Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
  )

  // Group records by house
  const grouped = {}
  records.forEach(r => {
    const houseName = r.students?.houses?.name || 'Unknown'
    if (!grouped[houseName]) grouped[houseName] = []
    grouped[houseName].push(r)
  })

  let yOffset = 38

  for (const [houseName, houseRecords] of Object.entries(grouped)) {
    const present = houseRecords.filter(r => r.status === 'present').length
    const absent  = houseRecords.filter(r => r.status === 'absent').length
    const leave   = houseRecords.filter(r => r.status === 'leave').length
    const total   = houseRecords.length

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NVS_NAVY)
    doc.text(`${houseName} House  (P:${present}  A:${absent}  L:${leave}  Total:${total})`, 14, yOffset)
    yOffset += 4

    const tableData = houseRecords
      .sort((a, b) => a.students?.roll_number?.localeCompare(b.students?.roll_number))
      .map(r => [
        r.students?.roll_number || '-',
        r.students?.name || '-',
        `Cls ${r.students?.classes?.grade}${r.students?.classes?.section}`,
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
        r.leave_type || '-',
        r.remarks || '-',
      ])

    doc.autoTable({
      startY: yOffset,
      head: [['Roll No', 'Name', 'Class', 'Status', 'Leave', 'Remarks']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: NVS_NAVY, textColor: 255, fontSize: 8 },
      bodyStyles:  { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 55 },
        2: { cellWidth: 18 },
        3: { cellWidth: 20 },
        4: { cellWidth: 18 },
        5: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawCell: (data) => {
        if (data.column.index === 3 && data.cell.section === 'body') {
          const status = data.cell.text[0].toLowerCase()
          if (status === 'Absent') {
            doc.setFillColor(254, 226, 226)
          } else if (status === 'Leave') {
            doc.setFillColor(254, 243, 199)
          }
        }
      },
    })

    yOffset = doc.lastAutoTable.finalY + 6
  }

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `JNV Haridwar Attendance System  |  Page ${i} of ${pageCount}`,
      105, 292, { align: 'center' }
    )
  }

  return doc
}

export async function exportAttendanceCSV({ date, houseId, sessionType }) {
  const records = await getAttendanceReport({
    houseId,
    fromDate: date,
    toDate: date,
    sessionType,
  })

  const rows = records.map(r => ({
    Date: date,
    Session: sessionType || 'All',
    House: r.students?.houses?.name,
    Class: `${r.students?.classes?.grade} ${r.students?.classes?.section}`,
    RollNo: r.students?.roll_number,
    Name: r.students?.name,
    Status: r.status,
    LeaveType: r.leave_type || '',
    Remarks: r.remarks || '',
    MarkedAt: format(new Date(r.marked_at), 'HH:mm:ss'),
  }))

  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `attendance_${date}_${sessionType || 'all'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export async function generateQRCardsPDF(students) {
  // Dynamically import qrcode only when needed
  const QRCode = (await import('qrcode')).default

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const CARD_W = 60
  const CARD_H = 55
  const COLS   = 3
  const ROWS   = 5
  const MARGIN = 10
  const GAP_X  = 5
  const GAP_Y  = 5

  let cardIdx = 0

  for (const student of students) {
    const pos = cardIdx % (COLS * ROWS)
    if (pos === 0 && cardIdx > 0) doc.addPage()

    const col = pos % COLS
    const row = Math.floor(pos / COLS)
    const x   = MARGIN + col * (CARD_W + GAP_X)
    const y   = MARGIN + row * (CARD_H + GAP_Y)

    // Card border
    doc.setDrawColor(...NVS_NAVY)
    doc.setLineWidth(0.4)
    doc.rect(x, y, CARD_W, CARD_H)

    // Card header
    doc.setFillColor(...NVS_NAVY)
    doc.rect(x, y, CARD_W, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.text('JNV HARIDWAR', x + CARD_W / 2, y + 4, { align: 'center' })
    doc.setFontSize(5)
    doc.text('Student ID Card', x + CARD_W / 2, y + 8, { align: 'center' })

    // QR code
    const qrDataUrl = await QRCode.toDataURL(student.qr_token, {
      width: 120,
      margin: 0,
      color: { dark: '#1a3a5c', light: '#ffffff' },
    })
    doc.addImage(qrDataUrl, 'PNG', x + CARD_W / 2 - 13, y + 12, 26, 26)

    // Student info
    doc.setTextColor(...NVS_NAVY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    const name = student.name.length > 22 ? student.name.slice(0, 21) + '…' : student.name
    doc.text(name, x + CARD_W / 2, y + 42, { align: 'center' })

    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(`Roll: ${student.roll_number}`, x + CARD_W / 2, y + 47, { align: 'center' })
    doc.text(
      `${student.houses?.name || ''} | Cls ${student.classes?.grade}${student.classes?.section || ''}`,
      x + CARD_W / 2, y + 51, { align: 'center' }
    )

    cardIdx++
  }

  return doc
}

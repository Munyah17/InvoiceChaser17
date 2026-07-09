/**
 * Professional PDF borders utility
 * Adds professional table borders, section borders, and layout frames to jsPDF documents
 */

export function addPageBorder(doc) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  doc.setDrawColor(100, 100, 100) // Gray border
  doc.setLineWidth(0.5)
  doc.rect(5, 5, pageW - 10, pageH - 10) // Main border frame
}

export function addSectionBox(doc, x, y, width, height, label = null, fillColor = [240, 240, 240]) {
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.setFillColor(...fillColor)
  doc.rect(x, y, width, height, 'FD') // Fill and draw

  if (label) {
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(label, x + 2, y - 2)
  }
}

export function addTableBorders(doc, startX, endX, startY, endY, rows = [], cols = []) {
  doc.setDrawColor(180, 180, 180) // Light gray for internal lines
  doc.setLineWidth(0.25)

  // Vertical lines
  if (cols.length > 0) {
    let x = startX
    cols.forEach((colWidth) => {
      doc.line(x, startY, x, endY)
      x += colWidth
    })
    doc.line(endX, startY, endX, endY) // Right border
  }

  // Horizontal lines
  if (rows.length > 0) {
    let y = startY
    rows.forEach((rowHeight) => {
      doc.line(startX, y, endX, y)
      y += rowHeight
    })
    doc.line(startX, endY, endX, endY) // Bottom border
  }

  // Bold outer border
  doc.setDrawColor(60, 60, 60)
  doc.setLineWidth(0.8)
  doc.rect(startX, startY, endX - startX, endY - startY)
}

export function enhanceAutoTable(options) {
  return {
    ...options,
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [200, 200, 200], // Light gray lines
      lineWidth: 0.25,
      ...options.bodyStyles,
    },
    headStyles: {
      fillColor: [40, 40, 40], // Dark gray header
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 3,
      lineColor: [60, 60, 60],
      lineWidth: 0.5,
      ...options.headStyles,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250], // Slight alternating row color
    },
    margin: { top: 5, right: 10, bottom: 5, left: 10 },
    theme: 'grid',
    ...options,
  }
}

export function addFinancialSummaryBox(doc, pageW, startY, items = []) {
  // items = [{ label, value, bold: false }, ...]
  const boxX = pageW - 70
  const boxWidth = 60
  const lineHeight = 6

  // Background
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.setFillColor(245, 245, 245)
  doc.rect(boxX, startY, boxWidth, items.length * lineHeight + 4, 'FD')

  let y = startY + 3
  items.forEach((item) => {
    doc.setFontSize(9)
    doc.setTextColor(40, 40, 40)

    if (item.bold) {
      doc.setFont(undefined, 'bold')
      doc.setFillColor(230, 230, 230) // Highlight subtotal/total rows
      doc.rect(boxX - 0.5, y - 2, boxWidth + 1, lineHeight, 'F')
    }

    doc.text(item.label, boxX + 2, y)
    doc.text(item.value, boxX + boxWidth - 2, y, { align: 'right' })
    doc.setFont(undefined, 'normal')
    y += lineHeight
  })
}

export function addInvoiceMetaBorder(doc, pageW, startX, startY, width, meta = {}) {
  // meta = { invoiceNumber, date, dueDate, poNumber, ... }
  const boxHeight = 20

  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.setFillColor(248, 248, 248)
  doc.rect(startX, startY, width, boxHeight, 'FD')

  let y = startY + 3
  const colWidth = width / 2

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)

  // Left column
  if (meta.invoiceNumber) {
    doc.text('Invoice #', startX + 2, y)
    doc.setFont(undefined, 'bold')
    doc.text(meta.invoiceNumber, startX + 2, y + 4)
    doc.setFont(undefined, 'normal')
  }

  // Right column
  if (meta.date) {
    doc.text('Invoice Date', startX + colWidth + 2, y)
    doc.setFont(undefined, 'bold')
    doc.text(meta.date, startX + colWidth + 2, y + 4)
    doc.setFont(undefined, 'normal')
  }

  // Second row
  y += 11
  if (meta.dueDate) {
    doc.text('Due Date', startX + 2, y)
    doc.setFont(undefined, 'bold')
    doc.text(meta.dueDate, startX + 2, y + 4)
    doc.setFont(undefined, 'normal')
  }

  if (meta.poNumber) {
    doc.text('PO #', startX + colWidth + 2, y)
    doc.setFont(undefined, 'bold')
    doc.text(meta.poNumber, startX + colWidth + 2, y + 4)
    doc.setFont(undefined, 'normal')
  }
}

export function addBillingInfoBoxes(doc, pageW, startY) {
  const boxWidth = 40
  const boxHeight = 30
  const gap = 5

  // Left box: BILL TO
  const leftX = 10
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.setFillColor(250, 250, 250)
  doc.rect(leftX, startY, boxWidth, boxHeight, 'FD')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('BILL TO', leftX + 2, startY + 3)

  // Right box: SHIP TO (if needed)
  const rightX = leftX + boxWidth + gap
  doc.rect(rightX, startY, boxWidth, boxHeight, 'FD')
  doc.text('PAYMENT TERMS', rightX + 2, startY + 3)
}

export function addFooterBorder(doc, pageW, pageH) {
  const footerY = pageH - 20
  const footerHeight = 15

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.setFillColor(248, 248, 248)
  doc.rect(10, footerY, pageW - 20, footerHeight, 'FD')

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Thank you for your business!', 12, footerY + 3)

  if (process.env.VITE_APP_URL) {
    doc.text(`Generated by InvoiceChaser • ${process.env.VITE_APP_URL}`, pageW - 12, footerY + 3, { align: 'right' })
  }
}

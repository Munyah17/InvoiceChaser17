import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './dateFormat'

/**
 * Generate a PDF invoice and download it
 * @param {Object} invoice - Invoice data
 * @param {Object} customer - Customer data
 * @param {Object} company - Company settings
 * @param {string} type - Document type (invoice, quotation, proforma)
 */
export const generateInvoicePDF = (invoice, customer, company, type = 'invoice') => {
  const doc = new jsPDF()
  
  const title = type === 'quotation' ? 'QUOTATION' : type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'
  
  // Add company header
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  doc.text(title, 105, 20, { align: 'center' })
  
  // Invoice details
  doc.setFontSize(10)
  doc.setFontSize(12)
  doc.text(`${title} #: ${invoice.invoice_number}`, 20, 40)
  doc.text(`Date: ${formatDate(new Date())}`, 20, 50)
  if (type === 'invoice') {
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 20, 60)
  } else {
    doc.text(`Valid Until: ${formatDate(invoice.due_date)}`, 20, 60)
  }
  
  // Company info
  doc.text(company.company_name || 'Your Company', 140, 40)
  doc.text(company.email || 'email@company.com', 140, 50)
  
  // Customer info
  doc.setFontSize(11)
  doc.text(type === 'quotation' ? 'Quote For:' : 'Bill To:', 20, 80)
  doc.setFontSize(10)
  doc.text(customer.name || 'Customer Name', 20, 90)
  doc.text(customer.email || 'customer@email.com', 20, 100)
  
  // Invoice table
  const tableData = [
    ['Description', 'Qty', 'Unit Price', 'Total'],
    [invoice.description || 'Services', '1', `$${invoice.amount}`, `$${invoice.amount}`],
  ]
  
  autoTable(doc, {
    startY: 120,
    head: [tableData[0]],
    body: [tableData[1]],
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0] },
  })
  
  // Total
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(`Total: $${invoice.amount}`, 140, finalY)
  
  // Notes
  if (invoice.notes) {
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text('Notes:', 20, finalY + 20)
    doc.text(invoice.notes, 20, finalY + 30, { maxWidth: 170 })
  }
  
  // Save PDF
  doc.save(`${title}_${invoice.invoice_number}.pdf`)
}

/**
 * Generate email template for invoice reminder
 * @param {Object} invoice - Invoice data
 * @param {Object} customer - Customer data
 * @param {Object} company - Company settings
 * @param {string} paymentLink - Unique payment link for chaser_link source
 * @returns {Object} - Email subject and body
 */
const DEBTOR_FEE_RATE = 0.025

export const generateReminderEmail = (invoice, customer, company, paymentLink) => {
  const companyName = company.company_name || 'Your Company'
  const customerName = customer.name || 'Customer'
  const invoiceNumber = invoice.invoice_number
  const currency = invoice.currency || 'USD'
  const amount = parseFloat(invoice.amount) || 0
  const fee = Math.round(amount * DEBTOR_FEE_RATE * 100) / 100
  const total = Math.round((amount + fee) * 100) / 100
  const dueDate = formatDate(invoice.due_date)

  const stripeLink = paymentLink ? `${paymentLink}${paymentLink.includes('?') ? '&' : '?'}gateway=stripe` : null
  const paynowLink = paymentLink ? `${paymentLink}${paymentLink.includes('?') ? '&' : '?'}gateway=paynow` : null

  return {
    subject: `Payment Reminder: Invoice ${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Reminder</h2>
        <p>Dear ${customerName},</p>
        <p>This is a friendly reminder that invoice <strong>${invoiceNumber}</strong> for <strong>${currency} ${amount.toFixed(2)}</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>Please ensure payment is arranged to avoid any late fees.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;padding:12px">
          <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px">Invoice amount</td><td style="padding:6px 12px;text-align:right;font-size:13px">${currency} ${amount.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280;font-size:13px">Payment processing fee (${(DEBTOR_FEE_RATE * 100).toFixed(1)}%)</td><td style="padding:6px 12px;text-align:right;font-size:13px">${currency} ${fee.toFixed(2)}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:700">Total due</td><td style="padding:6px 12px;text-align:right;font-weight:700">${currency} ${total.toFixed(2)}</td></tr>
        </table>
        ${paymentLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${stripeLink}"
             style="display: inline-block; margin: 0 6px 8px; padding: 14px 24px; background-color: #635bff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Pay via Card (Stripe)
          </a>
          <a href="${paynowLink}"
             style="display: inline-block; margin: 0 6px 8px; padding: 14px 24px; background-color: #00a651; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Pay via Paynow
          </a>
        </div>
        ` : ''}
        <p>Thank you for your business!</p>
        <p style="margin-top: 30px;">Best regards,<br>${companyName}</p>
      </div>
    `,
    text: `
      Payment Reminder

      Dear ${customerName},

      This is a friendly reminder that invoice ${invoiceNumber} for ${currency} ${amount.toFixed(2)} is due on ${dueDate}.

      Invoice amount: ${currency} ${amount.toFixed(2)}
      Payment processing fee (${(DEBTOR_FEE_RATE * 100).toFixed(1)}%): ${currency} ${fee.toFixed(2)}
      Total due: ${currency} ${total.toFixed(2)}

      ${paymentLink ? `Pay via Card (Stripe): ${stripeLink}\n      Pay via Paynow: ${paynowLink}` : ''}

      Thank you for your business!

      Best regards,
      ${companyName}
    `
  }
}

/**
 * Generate email template for new invoice
 * @param {Object} invoice - Invoice data
 * @param {Object} customer - Customer data
 * @param {Object} company - Company settings
 * @returns {Object} - Email subject and body
 */
export const generateNewInvoiceEmail = (invoice, customer, company) => {
  const companyName = company.company_name || 'Your Company'
  const customerName = customer.name || 'Customer'
  const invoiceNumber = invoice.invoice_number
  const amount = invoice.amount
  const dueDate = formatDate(invoice.due_date)
  
  return {
    subject: `New Invoice: ${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Invoice</h2>
        <p>Dear ${customerName},</p>
        <p>We have issued a new invoice <strong>${invoiceNumber}</strong> for <strong>$${amount}</strong>.</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
        <p><strong>Description:</strong> ${invoice.description || 'Services'}</p>
        <p>Please find the invoice attached for your records.</p>
        <p>Thank you for your business!</p>
        <p style="margin-top: 30px;">Best regards,<br>${companyName}</p>
      </div>
    `,
    text: `
      New Invoice
      
      Dear ${customerName},
      
      We have issued a new invoice ${invoiceNumber} for $${amount}.
      
      Due Date: ${dueDate}
      Description: ${invoice.description || 'Services'}
      
      Please find the invoice attached for your records.
      
      Thank you for your business!
      
      Best regards,
      ${companyName}
    `
  }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

/**
 * Trigger: Called by Vercel Cron (daily at 2 AM UTC)
 * Purpose: Generate recurring invoices whose next_run_date has arrived
 */
export default async function handler(req, res) {
  // Only allow POST from Vercel Cron (they use a header)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { authorization } = req.headers

    // Simple auth check: this is internal, so we verify Vercel is calling it
    if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('📅 Starting recurring invoice generation...')

    // Get all active recurring invoices where next_run_date <= today
    const { data: recurringInvoices, error: fetchErr } = await supabase
      .from('recurring_invoices')
      .select('*, customers(email, name)')
      .eq('status', 'active')
      .lte('next_run_date', new Date().toISOString().split('T')[0])

    if (fetchErr) {
      console.error('Fetch error:', fetchErr)
      return res.status(500).json({ error: 'Failed to fetch recurring invoices' })
    }

    if (!recurringInvoices || recurringInvoices.length === 0) {
      console.log('✓ No recurring invoices to process')
      return res.status(200).json({ processed: 0, message: 'No invoices due' })
    }

    let processed = 0
    const errors = []

    // Process each recurring invoice
    for (const recurring of recurringInvoices) {
      try {
        // Fetch the template invoice
        const { data: template, error: templateErr } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', recurring.template_invoice_id)
          .single()

        if (templateErr || !template) {
          errors.push(`No template found for recurring invoice ${recurring.id}`)
          continue
        }

        // Generate new invoice number with date
        const today = new Date()
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
        const newInvoiceNumber = `REC-${recurring.id.slice(0, 8)}-${dateStr}`

        // Create new invoice from template
        const { data: newInvoice, error: createErr } = await supabase
          .from('invoices')
          .insert([{
            user_id: template.user_id,
            customer_id: recurring.customer_id,
            invoice_number: newInvoiceNumber,
            description: template.description || `Recurring: ${template.invoice_number}`,
            amount: template.amount,
            currency: template.currency,
            status: 'pending',
            due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            is_recurring_generated: true,
            recurring_invoice_id: recurring.id,
          }])
          .select()

        if (createErr) {
          errors.push(`Failed to create invoice for recurring ${recurring.id}`)
          continue
        }

        // Calculate next run date
        let nextRunDate = new Date(recurring.next_run_date)

        const frequencyDays = {
          daily: 1,
          weekly: 7,
          biweekly: 14,
          monthly: 30,
          quarterly: 90,
          yearly: 365,
        }

        const daysToAdd = frequencyDays[recurring.frequency] || 30
        nextRunDate.setDate(nextRunDate.getDate() + daysToAdd)

        // Check if we should end the recurring invoice
        let newStatus = 'active'
        if (recurring.end_date && nextRunDate > new Date(recurring.end_date)) {
          newStatus = 'completed'
        }

        // Update recurring invoice with new next_run_date
        const { error: updateErr } = await supabase
          .from('recurring_invoices')
          .update({
            next_run_date: nextRunDate.toISOString().split('T')[0],
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recurring.id)

        if (updateErr) {
          errors.push(`Failed to update recurring invoice ${recurring.id}`)
          continue
        }

        // Log transaction
        await supabase
          .from('transactions')
          .insert([{
            user_id: template.user_id,
            account_id: null, // Will be determined by category
            type: 'invoice',
            amount: template.amount,
            currency: template.currency,
            description: `Recurring invoice generated: ${newInvoiceNumber}`,
            reference_type: 'invoice',
            reference_id: newInvoice[0]?.id,
            posted_date: new Date().toISOString().split('T')[0],
          }])
          .catch((err) => console.error('Transaction log error:', err))

        processed++
        console.log(`✓ Generated: ${newInvoiceNumber} for ${recurring.customers?.name}`)
      } catch (err) {
        console.error(`Error processing recurring ${recurring.id}:`, err)
        errors.push(err.message)
      }
    }

    console.log(`✅ Recurring invoice generation complete: ${processed} invoices generated`)

    return res.status(200).json({
      processed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('❌ Critical error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

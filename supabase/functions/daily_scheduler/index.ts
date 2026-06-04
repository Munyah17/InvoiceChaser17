// Scheduled reminder engine — called by Supabase cron (pg_cron) or an external scheduler.
// Recommended schedule: every 4 hours  →  0 */4 * * *
// This delegates all email logic to send_reminder_email which handles escalation.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno&dts'

serve(async (req) => {
  // Allow external cron services (e.g. cron-job.org) to call this with a secret header
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  )

  try {
    // Trigger the reminder engine (batch mode — no body needed)
    const { data, error } = await supabase.functions.invoke('send_reminder_email', { body: {} })

    return new Response(
      JSON.stringify({
        success: !error,
        reminder_result: data,
        error: error?.message,
        timestamp: new Date().toISOString(),
      }),
      { status: error ? 500 : 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('daily_scheduler error:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err), timestamp: new Date().toISOString() }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

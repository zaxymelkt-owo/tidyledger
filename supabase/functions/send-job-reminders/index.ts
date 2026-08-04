// Process due job SMS reminders (Twilio).
// Deploy: supabase functions deploy send-job-reminders --no-verify-jwt
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Optional: CRON_SECRET — require header x-cron-secret

import { handleCors, json } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'

type Reminder = {
  id: string
  job_id: string
  to_phone: string | null
  body: string | null
  channel: string
}

async function sendTwilioSms(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_FROM_NUMBER')
  if (!sid || !token || !from) {
    throw new Error('Twilio secrets not configured')
  }
  const auth = btoa(`${sid}:${token}`)
  const params = new URLSearchParams({ To: to, From: from, Body: body })
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || JSON.stringify(data))
  }
  return data
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405)
    }

    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const provided = req.headers.get('x-cron-secret')
      if (provided !== cronSecret) {
        return json({ error: 'Unauthorized' }, 401)
      }
    }

    const supabase = serviceClient()

    const { data: due, error } = await supabase
      .from('job_reminders')
      .select('id, job_id, to_phone, body, channel')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(25)

    if (error) return json({ error: error.message }, 500)

    const results: Array<{ id: string; ok: boolean; error?: string }> = []

    for (const row of (due ?? []) as Reminder[]) {
      try {
        if (row.channel !== 'sms' || !row.to_phone || !row.body) {
          throw new Error('missing phone or body')
        }
        await sendTwilioSms(row.to_phone, row.body)
        await supabase
          .from('job_reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
          .eq('id', row.id)
        await supabase
          .from('jobs')
          .update({ reminded_at: new Date().toISOString() })
          .eq('id', row.job_id)
        results.push({ id: row.id, ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'send failed'
        await supabase
          .from('job_reminders')
          .update({ status: 'failed', error: message })
          .eq('id', row.id)
        results.push({ id: row.id, ok: false, error: message })
      }
    }

    return json({ processed: results.length, results })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'failed' }, 500)
  }
})

/** Generate and download an .ics calendar file for jobs (Google/Apple/Outlook). */

export type CalendarJob = {
  id: string
  job_date: string // YYYY-MM-DD
  service?: string | null
  notes?: string | null
  status?: string | null
  customerName?: string | null
  address?: string | null
  city?: string | null
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** All-day event date as YYYYMMDD */
function icsDate(dateStr: string) {
  return dateStr.replace(/-/g, '')
}

function icsEscape(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function uidFor(job: CalendarJob) {
  return `job-${job.id}@tidyledger`
}

function eventBlock(job: CalendarJob) {
  const start = icsDate(job.job_date)
  // Exclusive end date for all-day events = next calendar day
  const d = new Date(job.job_date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const end = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

  const summary = [
    job.service || 'Cleaning job',
    job.customerName ? `— ${job.customerName}` : '',
  ]
    .join(' ')
    .trim()

  const location = [job.address, job.city].filter(Boolean).join(', ')
  const description = [job.notes, job.status ? `Status: ${job.status}` : '']
    .filter(Boolean)
    .join('\\n')

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  return [
    'BEGIN:VEVENT',
    `UID:${uidFor(job)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(summary)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n')
}

export function buildJobsIcs(jobs: CalendarJob[], calendarName = 'TidyLedger Jobs') {
  const events = jobs.map(eventBlock).join('\r\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TidyLedger//Jobs//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadJobsIcs(jobs: CalendarJob[], filename = 'tidyledger-jobs.ics') {
  const ics = buildJobsIcs(jobs)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Google Calendar template link for a single all-day job */
export function googleCalendarUrl(job: CalendarJob) {
  const start = icsDate(job.job_date)
  const d = new Date(job.job_date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const end = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const text = encodeURIComponent(
    [job.service || 'Cleaning job', job.customerName].filter(Boolean).join(' — ')
  )
  const details = encodeURIComponent(job.notes || '')
  const location = encodeURIComponent([job.address, job.city].filter(Boolean).join(', '))
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`
}

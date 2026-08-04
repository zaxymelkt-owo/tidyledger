import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import JobForm from '../components/JobForm'
import { supabase } from '../lib/supabase'
import { downloadJobsIcs, googleCalendarUrl } from '../lib/calendar'
import type { Customer, JobFormInput, JobStatus, JobWithCustomer } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; job: JobWithCustomer } | null
type Filter = 'all' | 'today' | 'upcoming' | 'unpaid' | 'completed'

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'completed', label: 'Completed' },
]

const statusStyles: Record<JobStatus, string> = {
  scheduled: 'bg-brass/10 text-brass',
  in_progress: 'bg-sage/10 text-sage-deep',
  completed: 'bg-line text-slate',
  cancelled: 'bg-clay/10 text-clay',
}

export default function Jobs() {
  const [jobs, setJobs] = useState<JobWithCustomer[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    const [jobsRes, customersRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(first_name, last_name, address, city)')
        .order('job_date', { ascending: false }),
      supabase.from('customers').select('*').order('last_name', { ascending: true }),
    ])

    if (jobsRes.error) setError(jobsRes.error.message)
    else setJobs((jobsRes.data as JobWithCustomer[]) ?? [])

    if (!jobsRes.error && customersRes.error) setError(customersRes.error.message)
    setCustomers(customersRes.data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    switch (filter) {
      case 'today':
        return jobs.filter((j) => j.job_date === today)
      case 'upcoming':
        return jobs.filter((j) => j.job_date >= today && j.status !== 'cancelled')
      case 'unpaid':
        return jobs.filter((j) => j.payment_status === 'unpaid')
      case 'completed':
        return jobs.filter((j) => j.status === 'completed')
      default:
        return jobs
    }
  }, [jobs, filter])

  async function handleSave(values: JobFormInput) {
    setSubmitting(true)
    setError(null)
    try {
      if (modal?.mode === 'edit') {
        const { error } = await supabase.from('jobs').update(values).eq('id', modal.job.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('jobs').insert(values)
        if (error) throw error
      }
      setModal(null)
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save job.')
    } finally {
      setSubmitting(false)
    }
  }

  async function queueSmsReminder(job: JobWithCustomer) {
    const { error } = await supabase.rpc('queue_job_sms_reminder', { p_job_id: job.id })
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    alert('SMS reminder queued for the day before this job (requires Twilio + send-job-reminders function).')
    await loadAll()
  }

  async function handleDelete(job: JobWithCustomer) {
    if (!confirm('Delete this job? This can\'t be undone.')) return
    const { error } = await supabase.from('jobs').delete().eq('id', job.id)
    if (error) setError(error.message)
    else setJobs((js) => js.filter((j) => j.id !== job.id))
  }

  return (
    <>
      <Topbar title="Jobs" subtitle={`${jobs.length} on the books`} />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('relation') && (
              <p className="mt-1 text-xs text-clay/80">
                Have you run <code className="font-mono-num">database/schema.sql</code> (and, if you set up
                Customers earlier, <code className="font-mono-num">database/002_jobs_add_fields.sql</code>) in
                your Supabase project?
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex gap-1.5 bg-paper-raised border border-line rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f.key ? 'bg-sage-deep text-white' : 'text-slate hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const rows = filtered.length ? filtered : jobs
              downloadJobsIcs(
                rows.map((j) => ({
                  id: j.id,
                  job_date: j.job_date,
                  service: j.service,
                  notes: j.notes,
                  status: j.status,
                  customerName: j.customers
                    ? `${j.customers.first_name} ${j.customers.last_name}`
                    : null,
                  address: j.customers?.address ?? null,
                  city: j.customers?.city ?? null,
                })),
                `tidyledger-jobs-${new Date().toISOString().slice(0, 10)}.ics`,
              )
            }}
            disabled={jobs.length === 0}
          >
            Export calendar
          </Button>
          <Button onClick={() => setModal({ mode: 'add' })}>+ Add job</Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate">
                    Loading jobs…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate">
                    {jobs.length === 0 ? 'No jobs yet — add your first one to get started.' : 'No jobs match this filter.'}
                  </td>
                </tr>
              )}

              {filtered.map((j) => (
                <tr key={j.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                  <td className="px-5 py-3 font-mono-num text-ink">{format(new Date(j.job_date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3 font-medium text-ink">
                    {j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate">{j.service || '—'}</td>
                  <td className="px-5 py-3 text-slate">{j.assigned_employee || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${statusStyles[j.status]}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${
                        j.payment_status === 'paid'
                          ? 'bg-sage/10 text-sage-deep'
                          : j.payment_status === 'partial'
                          ? 'bg-brass/10 text-brass'
                          : 'bg-clay/10 text-clay'
                      }`}
                    >
                      {j.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num text-ink">
                    {j.price != null ? `$${j.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <Link
                      to={`/jobs/${j.id}/field`}
                      className="text-xs font-medium text-sage-deep hover:underline mr-3"
                    >
                      Field
                    </Link>
                    <a
                      href={googleCalendarUrl({
                        id: j.id,
                        job_date: j.job_date,
                        service: j.service,
                        notes: j.notes,
                        customerName: j.customers
                          ? `${j.customers.first_name} ${j.customers.last_name}`
                          : null,
                        address: j.customers?.address ?? null,
                        city: j.customers?.city ?? null,
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-sage-deep hover:underline mr-3"
                    >
                      Calendar
                    </a>
                    <button
                      type="button"
                      onClick={() => queueSmsReminder(j)}
                      className="text-xs font-medium text-sage-deep hover:underline mr-3"
                      title="Queue day-before SMS to customer phone"
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => setModal({ mode: 'edit', job: j })}
                      className="text-xs font-medium text-sage-deep hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(j)} className="text-xs font-medium text-clay hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </main>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit job' : 'Add job'} onClose={() => setModal(null)}>
          <JobForm
            initial={modal.mode === 'edit' ? modal.job : null}
            customers={customers}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
            submitting={submitting}
          />
        </Modal>
      )}
    </>
  )
}

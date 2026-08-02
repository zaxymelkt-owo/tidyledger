import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import PhotoCapture from '../components/field/PhotoCapture'
import CheckInOut from '../components/field/CheckInOut'
import SignaturePad from '../components/field/SignaturePad'
import { supabase } from '../lib/supabase'
import { uploadJobFile, publicUrlFor } from '../lib/media'
import { enqueue, isOnline } from '../lib/offlineQueue'
import { useAuth } from '../contexts/AuthContext'
import type { JobWithCustomer } from '../types'

type Photo = {
  id: string
  storage_path: string
  caption: string | null
  taken_at: string
}
type Checkin = {
  id: string
  kind: 'check_in' | 'check_out'
  lat: number
  lng: number
  noted_at: string
  employee_name: string | null
}
type Signature = {
  id: string
  signer_name: string
  storage_path: string
  signed_at: string
}

export default function JobField() {
  const { jobId } = useParams<{ jobId: string }>()
  const { session } = useAuth()
  const [job, setJob] = useState<JobWithCustomer | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signerName, setSignerName] = useState('')
  const [tab, setTab] = useState<'checkin' | 'photos' | 'signature'>('checkin')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) load()
  }, [jobId])

  async function load() {
    setLoading(true)
    setError(null)
    const [jobRes, photoRes, checkRes, sigRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(first_name, last_name, address, city)')
        .eq('id', jobId!)
        .maybeSingle(),
      supabase.from('job_photos').select('*').eq('job_id', jobId!).order('taken_at', { ascending: false }),
      supabase.from('job_checkins').select('*').eq('job_id', jobId!).order('noted_at', { ascending: false }),
      supabase.from('job_signatures').select('*').eq('job_id', jobId!).order('signed_at', { ascending: false }),
    ])
    if (jobRes.error) setError(jobRes.error.message)
    else setJob(jobRes.data as JobWithCustomer)
    setPhotos(photoRes.data ?? [])
    setCheckins(checkRes.data ?? [])
    setSignatures(sigRes.data ?? [])
    setLoading(false)
  }

  function flash(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3000)
  }

  async function recordCheckin(
    kind: 'check_in' | 'check_out',
    pos: { lat: number; lng: number; accuracy_m: number | null }
  ) {
    const employee = session?.user.email ?? 'staff'
    const payload = {
      job_id: jobId,
      kind,
      lat: pos.lat,
      lng: pos.lng,
      accuracy_m: pos.accuracy_m,
      employee_name: employee,
      noted_at: new Date().toISOString(),
    }

    if (!isOnline()) {
      await enqueue({ type: 'checkin', payload })
      flash(`Saved ${kind === 'check_in' ? 'check-in' : 'check-out'} offline — will sync later`)
      return
    }

    const { error } = await supabase.from('job_checkins').insert(payload)
    if (error) {
      setError(error.message)
      return
    }
    const jobPatch =
      kind === 'check_in'
        ? { checked_in_at: payload.noted_at, status: 'in_progress' as const }
        : { checked_out_at: payload.noted_at }
    await supabase.from('jobs').update(jobPatch).eq('id', jobId!)
    flash(kind === 'check_in' ? 'Checked in' : 'Checked out')
    await load()
  }

  async function handlePhoto(blob: Blob, caption: string) {
    if (!isOnline()) {
      // Store as base64 in offline queue (small photos only after compression)
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      const b64 = btoa(binary)
      await enqueue({
        type: 'photo_meta',
        payload: { job_id: jobId, caption, b64, content_type: blob.type || 'image/jpeg' },
      })
      flash('Photo queued offline')
      return
    }
    try {
      const { path } = await uploadJobFile(jobId!, blob, 'photos', 'jpg')
      let lat: number | null = null
      let lng: number | null = null
      try {
        const { getCurrentPosition } = await import('../lib/geo')
        const pos = await getCurrentPosition({ timeout: 5000 })
        lat = pos.lat
        lng = pos.lng
      } catch {
        /* optional */
      }
      const { error } = await supabase.from('job_photos').insert({
        job_id: jobId,
        storage_path: path,
        caption: caption || null,
        lat,
        lng,
        uploaded_by: session?.user.email ?? null,
      })
      if (error) throw error
      flash('Photo uploaded')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  async function handleSignature(blob: Blob) {
    if (!signerName.trim()) {
      setError('Enter the signer name first')
      return
    }
    if (!isOnline()) {
      const buf = await blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      const b64 = btoa(binary)
      await enqueue({
        type: 'signature_meta',
        payload: {
          job_id: jobId,
          signer_name: signerName.trim(),
          b64,
          content_type: 'image/png',
        },
      })
      flash('Signature queued offline')
      return
    }
    try {
      const { path } = await uploadJobFile(jobId!, blob, 'signatures', 'png')
      let lat: number | null = null
      let lng: number | null = null
      try {
        const { getCurrentPosition } = await import('../lib/geo')
        const pos = await getCurrentPosition({ timeout: 5000 })
        lat = pos.lat
        lng = pos.lng
      } catch {
        /* optional */
      }
      const { error } = await supabase.from('job_signatures').insert({
        job_id: jobId,
        signer_name: signerName.trim(),
        signer_role: 'customer',
        storage_path: path,
        lat,
        lng,
      })
      if (error) throw error
      await supabase.from('jobs').update({ signature_captured: true }).eq('id', jobId!)
      flash('Signature saved')
      setSignerName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save signature')
    }
  }

  const lastIn = checkins.find((c) => c.kind === 'check_in')
  const lastOut = checkins.find((c) => c.kind === 'check_out')

  return (
    <>
      <Topbar
        title="Field mode"
        subtitle={
          job
            ? `${job.customers ? `${job.customers.first_name} ${job.customers.last_name}` : 'Job'} · ${format(new Date(job.job_date + 'T00:00:00'), 'MMM d')}`
            : 'Loading…'
        }
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto w-full">
        <div className="mb-4">
          <Link to="/jobs" className="text-xs font-medium text-sage-deep hover:underline">
            ← Back to jobs
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('relation') && (
              <p className="mt-1 text-xs">
                Run <code className="font-mono-num">database/007_field_ops.sql</code> in Supabase (includes storage bucket).
              </p>
            )}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-deep">
            {notice}
          </div>
        )}

        {loading && <p className="text-slate text-center py-12">Loading job…</p>}

        {job && (
          <>
            <div className="ticket-card p-4 mb-4 text-sm">
              <p className="font-medium text-ink">
                {job.customers
                  ? `${job.customers.first_name} ${job.customers.last_name}`
                  : 'Customer'}
              </p>
              <p className="text-slate">
                {[job.customers?.address, job.customers?.city].filter(Boolean).join(', ') || 'No address'}
              </p>
              <p className="text-slate mt-1 capitalize">
                {job.service || 'Service'} · {job.status.replace('_', ' ')} ·{' '}
                {job.assigned_employee || 'Unassigned'}
              </p>
            </div>

            <div className="flex gap-1.5 bg-paper-raised border border-line rounded-lg p-1 mb-5">
              {(
                [
                  ['checkin', 'GPS'],
                  ['photos', 'Photos'],
                  ['signature', 'Signature'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    tab === key ? 'bg-sage-deep text-white' : 'text-slate hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'checkin' && (
              <div className="ticket-card p-5 space-y-4">
                <h2 className="font-display font-semibold text-ink">Check-in / check-out</h2>
                <CheckInOut
                  lastCheckIn={lastIn}
                  lastCheckOut={lastOut}
                  onCheckIn={(pos) => recordCheckin('check_in', pos)}
                  onCheckOut={(pos) => recordCheckin('check_out', pos)}
                />
                {checkins.length > 0 && (
                  <ul className="text-xs text-slate border-t border-line pt-3 space-y-1">
                    {checkins.slice(0, 6).map((c) => (
                      <li key={c.id}>
                        <span className="capitalize font-medium text-ink">
                          {c.kind.replace('_', '-')}
                        </span>{' '}
                        · {new Date(c.noted_at).toLocaleString()} · {c.employee_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'photos' && (
              <div className="ticket-card p-5 space-y-4">
                <h2 className="font-display font-semibold text-ink">Job photos</h2>
                <PhotoCapture onCapture={handlePhoto} />
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((p) => (
                    <figure key={p.id} className="rounded-lg border border-line overflow-hidden bg-paper">
                      <img
                        src={publicUrlFor(p.storage_path)}
                        alt={p.caption || 'Job photo'}
                        className="w-full h-32 object-cover"
                      />
                      <figcaption className="px-2 py-1.5 text-[11px] text-slate truncate">
                        {p.caption || format(new Date(p.taken_at), 'MMM d h:mm a')}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                {photos.length === 0 && (
                  <p className="text-sm text-slate text-center py-4">No photos yet for this job.</p>
                )}
              </div>
            )}

            {tab === 'signature' && (
              <div className="ticket-card p-5 space-y-4">
                <h2 className="font-display font-semibold text-ink">Digital signature</h2>
                <label className="block">
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate mb-1.5">
                    Signer name
                  </span>
                  <input
                    className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Customer full name"
                  />
                </label>
                <SignaturePad onSave={handleSignature} />
                {signatures.length > 0 && (
                  <div className="border-t border-line pt-3 space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate">Saved</p>
                    {signatures.map((s) => (
                      <div key={s.id} className="rounded-lg border border-line p-2 bg-paper">
                        <img
                          src={publicUrlFor(s.storage_path)}
                          alt={`Signature of ${s.signer_name}`}
                          className="w-full h-20 object-contain bg-white"
                        />
                        <p className="text-xs text-slate mt-1">
                          {s.signer_name} · {format(new Date(s.signed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              {job.status !== 'completed' && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await supabase.from('jobs').update({ status: 'completed' }).eq('id', job.id)
                    flash('Marked completed')
                    load()
                  }}
                >
                  Mark job completed
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

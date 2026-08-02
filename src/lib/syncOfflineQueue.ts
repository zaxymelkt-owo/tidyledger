import { supabase } from './supabase'
import { listQueue, removeFromQueue, bumpRetry, isOnline } from './offlineQueue'
import { uploadJobFile } from './media'

function b64ToBlob(b64: string, contentType: string): Blob {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: contentType })
}

/** Flush IndexedDB offline queue when back online */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 }
  const items = await listQueue()
  let synced = 0
  let failed = 0

  for (const item of items) {
    try {
      if (item.type === 'checkin') {
        const { error } = await supabase.from('job_checkins').insert(item.payload)
        if (error) throw error
        const kind = item.payload.kind as string
        const jobId = item.payload.job_id as string
        if (kind === 'check_in') {
          await supabase
            .from('jobs')
            .update({ checked_in_at: item.payload.noted_at, status: 'in_progress' })
            .eq('id', jobId)
        } else {
          await supabase
            .from('jobs')
            .update({ checked_out_at: item.payload.noted_at })
            .eq('id', jobId)
        }
      } else if (item.type === 'photo_meta') {
        const jobId = item.payload.job_id as string
        const blob = b64ToBlob(item.payload.b64 as string, (item.payload.content_type as string) || 'image/jpeg')
        const { path } = await uploadJobFile(jobId, blob, 'photos', 'jpg')
        const { error } = await supabase.from('job_photos').insert({
          job_id: jobId,
          storage_path: path,
          caption: (item.payload.caption as string) || null,
        })
        if (error) throw error
      } else if (item.type === 'signature_meta') {
        const jobId = item.payload.job_id as string
        const blob = b64ToBlob(item.payload.b64 as string, 'image/png')
        const { path } = await uploadJobFile(jobId, blob, 'signatures', 'png')
        const { error } = await supabase.from('job_signatures').insert({
          job_id: jobId,
          signer_name: item.payload.signer_name,
          signer_role: 'customer',
          storage_path: path,
        })
        if (error) throw error
        await supabase.from('jobs').update({ signature_captured: true }).eq('id', jobId)
      }
      await removeFromQueue(item.id)
      synced += 1
    } catch (e) {
      console.warn('Offline sync failed for', item.id, e)
      await bumpRetry(item.id)
      failed += 1
    }
  }
  return { synced, failed }
}

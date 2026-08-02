import { supabase } from './supabase'

const BUCKET = 'job-media'

export async function uploadJobFile(
  jobId: string,
  file: Blob,
  folder: 'photos' | 'signatures',
  ext = 'jpg'
): Promise<{ path: string; publicUrl: string }> {
  const path = `${jobId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || (ext === 'png' ? 'image/png' : 'image/jpeg'),
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export function publicUrlFor(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Compress an image File for mobile upload */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || file), 'image/jpeg', quality)
  })
}

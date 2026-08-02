import { useRef, useState } from 'react'
import Button from '../ui/Button'
import { compressImage } from '../../lib/media'

type Props = {
  onCapture: (blob: Blob, caption: string) => void | Promise<void>
  disabled?: boolean
}

export default function PhotoCapture({ onCapture, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const compressed = await compressImage(file)
      setBlob(compressed)
      setPreview(URL.createObjectURL(compressed))
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!blob) return
    setBusy(true)
    try {
      await onCapture(blob, caption)
      setBlob(null)
      setPreview(null)
      setCaption('')
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy && !preview ? 'Processing…' : 'Take / choose photo'}
        </Button>
      </div>
      {preview && (
        <>
          <img src={preview} alt="Preview" className="rounded-lg border border-line max-h-48 object-contain w-full bg-paper" />
          <input
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <Button type="button" onClick={submit} disabled={disabled || busy}>
            {busy ? 'Uploading…' : 'Upload photo'}
          </Button>
        </>
      )}
    </div>
  )
}

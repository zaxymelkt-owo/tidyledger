import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type HeaderMenuProps = {
  trigger: ReactElement
  align?: 'left' | 'right'
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export default function HeaderMenu({
  trigger,
  align = 'right',
  onOpenChange,
  children,
}: HeaderMenuProps) {
  const [open, setOpenState] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelWidth = 256

  function setOpen(next: boolean) {
    setOpenState(next)
    onOpenChange?.(next)
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }

    function place() {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const margin = 12
      let left = align === 'right' ? r.right - panelWidth : r.left
      left = Math.min(Math.max(left, margin), window.innerWidth - panelWidth - margin)
      setPos({ top: r.bottom + 8, left })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align])

  useLayoutEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (
        anchorRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onClick={() => {
          console.log('[HeaderMenu] trigger clicked, open →', !open)
          setOpen(!open)
        }}
      >
        {trigger}
      </span>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[101] w-64 ticket-card p-2 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
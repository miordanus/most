'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'

export type SheetVariant = 'sheet' | 'modal' | 'drawer'

const DISMISS_THRESHOLD = 110

export function BottomSheet({
  open,
  onClose,
  height = '88%',
  width,
  variant = 'sheet',
  children,
  footer,
  contentRef,
  ariaLabel,
  className = '',
}: {
  open: boolean
  onClose: () => void
  height?: string
  width?: string
  variant?: SheetVariant
  children: ReactNode
  footer?: ReactNode
  contentRef?: Ref<HTMLDivElement>
  ariaLabel?: string
  className?: string
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [dragY, setDragY] = useState(0)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Reset drag offset whenever the sheet opens/closes.
  useEffect(() => {
    setDragY(0)
  }, [open])

  // Swipe-down to dismiss (mobile bottom sheet only).
  useEffect(() => {
    if (!open || variant !== 'sheet') return
    const sheet = sheetRef.current
    if (!sheet) return
    let startY = 0
    let dragging = false
    let cur = 0

    const onStart = (e: TouchEvent) => {
      const body = bodyRef.current
      // Only begin a dismiss-drag when content is scrolled to the very top,
      // so normal content scrolling is unaffected.
      if (body && body.scrollTop > 0) {
        dragging = false
        return
      }
      dragging = true
      startY = e.touches[0].clientY
      cur = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!dragging) return
      const dy = e.touches[0].clientY - startY
      if (dy > 0) {
        cur = dy
        setDragY(dy)
        e.preventDefault() // stop page pull-to-refresh / overscroll
      } else {
        cur = 0
        setDragY(0)
      }
    }
    const onEnd = () => {
      if (!dragging) return
      dragging = false
      if (cur > DISMISS_THRESHOLD) onClose()
      setDragY(0)
    }

    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [open, variant, onClose])

  const sheetStyle: CSSProperties = {}
  if (variant === 'sheet') sheetStyle.height = height
  if (variant === 'drawer') sheetStyle.width = width || '380px'
  if (variant === 'modal') {
    sheetStyle.height = height
    if (width) sheetStyle.width = width
  }
  if (variant === 'sheet' && dragY > 0) {
    sheetStyle.transform = `translateY(${dragY}px)`
    sheetStyle.transition = 'none'
  }

  const setBody = (el: HTMLDivElement | null) => {
    bodyRef.current = el
    if (typeof contentRef === 'function') contentRef(el)
    else if (contentRef) (contentRef as { current: HTMLDivElement | null }).current = el
  }

  return (
    <>
      <div
        className={'mb-scrim' + (open ? ' is-open' : '')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`mb-sheet mb-sheet--${variant} ${className} ${open ? 'is-open' : ''}`}
        style={sheetStyle}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {variant === 'sheet' && (
          <div className="mb-sheet-handle" onClick={onClose}>
            <span />
          </div>
        )}
        <div className="mb-sheet-body" ref={setBody}>
          {children}
        </div>
        {footer && <div className="mb-sheet-footer">{footer}</div>}
      </div>
    </>
  )
}

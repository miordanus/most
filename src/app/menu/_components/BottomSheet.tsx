'use client'

import { useEffect, type CSSProperties, type ReactNode, type Ref } from 'react'

export type SheetVariant = 'sheet' | 'modal' | 'drawer'

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

  const sheetStyle: CSSProperties = {}
  if (variant === 'sheet') sheetStyle.height = height
  if (variant === 'drawer') sheetStyle.width = width || '380px'
  if (variant === 'modal') {
    sheetStyle.height = height
    if (width) sheetStyle.width = width
  }

  return (
    <>
      <div
        className={'mb-scrim' + (open ? ' is-open' : '')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
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
        <div className="mb-sheet-body" ref={contentRef}>
          {children}
        </div>
        {footer && <div className="mb-sheet-footer">{footer}</div>}
      </div>
    </>
  )
}

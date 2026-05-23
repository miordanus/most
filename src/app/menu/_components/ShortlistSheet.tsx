'use client'

import type { ShortlistItem } from '@/lib/menu/types'
import { BottomSheet, type SheetVariant } from './BottomSheet'
import { ArchMark } from './brand/ArchMark'
import { DishMedia } from './brand/DishMedia'
import { Icon } from './brand/Icon'
import { copy, fmtPriceWithRub } from '@/menu/copy'

export function ShortlistSheet({
  open,
  onClose,
  items,
  onInc,
  onDec,
  onClear,
  variant = 'sheet',
}: {
  open: boolean
  onClose: () => void
  items: ShortlistItem[]
  onInc: (uid: string) => void
  onDec: (uid: string) => void
  onClear: () => void
  variant?: SheetVariant
}) {
  const total = items.reduce((s, it) => s + it.lineTotal * it.qty, 0)
  const empty = items.length === 0

  const footer = empty ? null : (
    <div className="mb-short-summary">
      <div className="mb-short-total-row">
        <span className="mb-short-total-l">Итого</span>
        <span className="mb-short-total-v">{fmtPriceWithRub(total)}</span>
      </div>
      <div className="mb-short-banner">
        <ArchMark size={32} />
        <div>
          <div className="mb-short-banner-title">{copy.short.bannerTitle}</div>
          <div className="mb-short-banner-sub">{copy.short.bannerSub}</div>
        </div>
      </div>
      <button className="mb-clear" onClick={onClear}>
        {copy.short.clear}
      </button>
    </div>
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      height={variant === 'drawer' ? '100%' : '88%'}
      width={variant === 'drawer' ? '400px' : undefined}
      variant={variant}
      ariaLabel="Избранное к столу"
      footer={footer}
      className="mb-sheet--shortlist"
    >
      <div className="mb-short-head">
        <div>
          <div className="mb-section-eyebrow">{copy.short.eyebrow}</div>
          <h2 className="mb-detail-name" style={{ marginTop: 8 }}>
            {copy.short.headline}
          </h2>
        </div>
        <button className="mb-icon-btn" onClick={onClose} aria-label={copy.detail.close}>
          <Icon name="x" size={18} color="var(--text-1)" />
        </button>
      </div>

      <div className="mb-short-content">
        {empty ? (
          <div className="mb-empty">
            <Icon name="heart" size={56} color="var(--text-2)" strokeWidth={1.4} />
            <div className="mb-empty-title">{copy.short.emptyTitle}</div>
            <div className="mb-empty-sub">{copy.short.emptySub}</div>
          </div>
        ) : (
          <div className="mb-short-list">
            {items.map((it) => (
              <ShortItem
                key={it.uid}
                item={it}
                onInc={() => onInc(it.uid)}
                onDec={() => onDec(it.uid)}
              />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

function ShortItem({
  item,
  onInc,
  onDec,
}: {
  item: ShortlistItem
  onInc: () => void
  onDec: () => void
}) {
  const { dish, addons, mods, option, qty, lineTotal } = item
  const extras = [
    option?.name,
    ...addons.map((a) => a.name),
    ...mods.map((m) => m.name),
  ].filter(Boolean)

  return (
    <div className="mb-short-item">
      <div className="mb-short-img">
        <DishMedia photo={dish.photo} ratio="1 / 1" markScale={0.5} alt={dish.name} sizes="88px" />
      </div>
      <div className="mb-short-item-body">
        <div className="mb-short-item-name">{dish.name}</div>
        {extras.length > 0 && (
          <div className="mb-short-extras">{extras.join(' · ')}</div>
        )}
        <div className="mb-short-bottom">
          <div className="mb-qty">
            <button onClick={onDec} aria-label={copy.short.qtyDecAria}>
              <Icon name="minus" size={14} />
            </button>
            <span>{qty}</span>
            <button onClick={onInc} aria-label={copy.short.qtyIncAria}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          <div className="mb-short-line-total">{fmtPriceWithRub(lineTotal * qty)}</div>
        </div>
      </div>
    </div>
  )
}

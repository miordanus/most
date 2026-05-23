'use client'

import { useEffect, useState } from 'react'
import type { Dish, Addon, Mod, Option } from '@/lib/menu/types'
import { BottomSheet, type SheetVariant } from './BottomSheet'
import { DishMedia } from './brand/DishMedia'
import { Icon } from './brand/Icon'
import { copy, fmtNum, fmtPriceWithRub } from '@/menu/copy'

export type AddPayload = {
  dish: Dish
  addons: Addon[]
  mods: Mod[]
  option: Option | null
  lineTotal: number
}

export function DishDetailSheet({
  dish,
  open,
  onClose,
  onAddToList,
  variant = 'sheet',
}: {
  dish: Dish | null
  open: boolean
  onClose: () => void
  onAddToList: (p: AddPayload) => void
  variant?: SheetVariant
}) {
  const [addonsSel, setAddonsSel] = useState<Record<string, boolean>>({})
  const [modsSel, setModsSel] = useState<Record<string, boolean>>({})
  const [opt, setOpt] = useState<string | null>(null)

  useEffect(() => {
    if (!dish) return
    setAddonsSel({})
    setModsSel({})
    if (dish.options) {
      const def = dish.options.options.find((o) => o.default) ?? dish.options.options[0]
      setOpt(def?.id ?? null)
    } else {
      setOpt(null)
    }
  }, [dish?.id])

  if (!dish) {
    return <BottomSheet open={false} onClose={onClose} variant={variant}><></></BottomSheet>
  }

  const addonsTotal = dish.addons.reduce(
    (s, a) => s + (addonsSel[a.id] ? a.price : 0),
    0,
  )
  const modsTotal = dish.mods.reduce(
    (s, m) => s + (modsSel[m.id] ? m.price : 0),
    0,
  )
  const basePrice = dish.price ?? 0
  const lineTotal = basePrice + addonsTotal + modsTotal

  const toggleAddon = (id: string) =>
    setAddonsSel((s) => ({ ...s, [id]: !s[id] }))
  const toggleMod = (id: string) =>
    setModsSel((s) => ({ ...s, [id]: !s[id] }))

  const footer = (
    <button
      className="mb-cta"
      onClick={() => {
        const selectedAddons = dish.addons.filter((a) => addonsSel[a.id])
        const selectedMods = dish.mods.filter((m) => modsSel[m.id])
        const selectedOption =
          dish.options?.options.find((o) => o.id === opt) ?? null
        onAddToList({
          dish,
          addons: selectedAddons,
          mods: selectedMods,
          option: selectedOption,
          lineTotal,
        })
        onClose()
      }}
    >
      <span>{copy.detail.cta}</span>
      <span className="mb-cta-price">{fmtPriceWithRub(lineTotal)}</span>
    </button>
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      height={variant === 'modal' ? '90vh' : '92%'}
      width={variant === 'modal' ? '720px' : undefined}
      variant={variant}
      ariaLabel="Карточка блюда"
      footer={footer}
      className="mb-sheet--detail"
    >
      <div className="mb-detail-hero">
        <DishMedia
          photo={dish.photo}
          ratio={variant === 'modal' ? '16 / 9' : '4 / 3'}
          markScale={0.55}
          alt={dish.name}
          sizes={variant === 'modal' ? '720px' : '100vw'}
        />
        <div className="mb-detail-hero-grad" />
        <button
          className="mb-detail-close"
          onClick={onClose}
          aria-label={copy.detail.close}
        >
          <Icon name="x" size={18} color="#fff" />
        </button>
      </div>

      <div className="mb-detail-content">
        <h2 className="mb-detail-name">{dish.name}</h2>
        {dish.desc && <p className="mb-detail-desc">{dish.desc}</p>}

        <div className="mb-nutri">
          <NutCell label={copy.detail.nut.g} value={dish.weight} />
          <NutCell label={copy.detail.nut.kcal} value={dish.kcal} />
          <NutCell label={copy.detail.nut.protein} value={dish.protein} />
          <NutCell label={copy.detail.nut.fat} value={dish.fat} />
          <NutCell label={copy.detail.nut.carbs} value={dish.carbs} />
        </div>

        {dish.ingredients && (
          <div className="mb-detail-block">
            <div className="mb-block-label">{copy.detail.sections.ingredients}</div>
            <p className="mb-ingredients">{dish.ingredients}</p>
          </div>
        )}

        {dish.options && (
          <div className="mb-detail-block">
            <div className="mb-block-label">
              {dish.options.label}
              {dish.options.required && (
                <span className="mb-req"> · {copy.detail.required}</span>
              )}
            </div>
            <div className="mb-radio-grid">
              {dish.options.options.map((o) => (
                <button
                  key={o.id}
                  className={'mb-radio' + (opt === o.id ? ' is-on' : '')}
                  onClick={() => setOpt(o.id)}
                >
                  <span className="mb-radio-name">{o.name}</span>
                  {o.sub && <span className="mb-radio-sub">{o.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {dish.addons.length > 0 && (
          <div className="mb-detail-block">
            <div className="mb-block-label">{copy.detail.sections.addons}</div>
            <div className="mb-opt-list">
              {dish.addons.map((a) => (
                <label
                  key={a.id}
                  className={'mb-opt' + (addonsSel[a.id] ? ' is-on' : '')}
                >
                  <input
                    type="checkbox"
                    checked={!!addonsSel[a.id]}
                    onChange={() => toggleAddon(a.id)}
                  />
                  <span className="mb-opt-box">
                    {addonsSel[a.id] && <Icon name="check" size={12} color="#fff" />}
                  </span>
                  <span className="mb-opt-name">{a.name}</span>
                  <span className="mb-opt-price">+{fmtPriceWithRub(a.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {dish.mods.length > 0 && (
          <div className="mb-detail-block">
            <div className="mb-block-label">{copy.detail.sections.mods}</div>
            <div className="mb-opt-list">
              {dish.mods.map((m) => (
                <label
                  key={m.id}
                  className={'mb-opt' + (modsSel[m.id] ? ' is-on' : '')}
                >
                  <input
                    type="checkbox"
                    checked={!!modsSel[m.id]}
                    onChange={() => toggleMod(m.id)}
                  />
                  <span className="mb-opt-box">
                    {modsSel[m.id] && <Icon name="check" size={12} color="#fff" />}
                  </span>
                  <span className="mb-opt-name">{m.name}</span>
                  {m.price > 0 && (
                    <span className="mb-opt-price">+{fmtPriceWithRub(m.price)}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

function NutCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="mb-nutri-cell">
      <div className="mb-nutri-v">{fmtNum(value)}</div>
      <div className="mb-nutri-l">{label}</div>
    </div>
  )
}

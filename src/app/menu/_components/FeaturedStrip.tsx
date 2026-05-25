'use client'

import type { Dish } from '@/lib/menu/types'
import { DishMedia } from './brand/DishMedia'
import { Icon } from './brand/Icon'
import { copy, fmtPriceWithRub } from '@/menu/copy'

export function FeaturedStrip({
  dishes,
  onOpen,
  onAdd,
  isInList,
}: {
  dishes: Dish[]
  onOpen: (d: Dish) => void
  onAdd: (d: Dish) => void
  isInList: (id: string) => boolean
}) {
  if (!dishes.length) return null
  return (
    <section className="mb-section mb-section--featured" aria-label={copy.featured.sectionTitle}>
      <div className="mb-featured-row">
        {dishes.map((d) => {
          const inList = isInList(d.id)
          return (
            <article key={d.id} className="mb-featured-card" onClick={() => onOpen(d)}>
              <div className="mb-featured-media">
                <DishMedia photo={d.photo} ratio="4 / 5" alt={d.name} sizes="(max-width: 900px) 70vw, 33vw" />
                <div className="mb-featured-badge">{copy.featured.badge}</div>
                <button
                  className={'mb-featured-fav' + (inList ? ' is-in' : '')}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAdd(d)
                  }}
                  aria-label={inList ? copy.card.removeAria : copy.card.addAria}
                >
                  <Icon name={inList ? 'heart-fill' : 'heart'} size={16} color="#fff" />
                </button>
              </div>
              <div className="mb-featured-body">
                <h3 className="mb-featured-name">{d.name}</h3>
                {d.short && <p className="mb-featured-short">{d.short}</p>}
                <div className="mb-featured-price">{fmtPriceWithRub(d.price)}</div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

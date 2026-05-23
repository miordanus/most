'use client'

import type { Dish } from '@/lib/menu/types'
import { DishMedia } from './brand/DishMedia'
import { copy, fmtPriceWithRub } from '@/menu/copy'

export function FeaturedStrip({
  dishes,
  onOpen,
}: {
  dishes: Dish[]
  onOpen: (d: Dish) => void
}) {
  if (!dishes.length) return null
  return (
    <section className="mb-section" aria-label={copy.featured.sectionTitle}>
      <header className="mb-section-head">
        <span className="mb-section-eyebrow">— 01</span>
        <h2 className="mb-section-title">{copy.featured.sectionTitle}</h2>
      </header>
      <div className="mb-featured-row">
        {dishes.map((d) => (
          <article key={d.id} className="mb-featured-card" onClick={() => onOpen(d)}>
            <div className="mb-featured-media">
              <DishMedia photo={d.photo} ratio="4 / 5" alt={d.name} sizes="(max-width: 900px) 70vw, 33vw" />
              <div className="mb-featured-badge">{copy.featured.badge}</div>
            </div>
            <div className="mb-featured-body">
              <h3 className="mb-featured-name">{d.name}</h3>
              {d.short && <p className="mb-featured-short">{d.short}</p>}
              {d.price != null && d.price > 0 && (
                <div className="mb-featured-price">{fmtPriceWithRub(d.price)}</div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

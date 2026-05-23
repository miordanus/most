'use client'

import { forwardRef } from 'react'
import type { Category, Dish } from '@/lib/menu/types'
import { DishCard } from './DishCard'
import { copy } from '@/menu/copy'

type Props = {
  category: Category
  index: number
  dishes: Dish[]
  onOpen: (d: Dish) => void
  onAdd: (d: Dish) => void
  isInList: (id: string) => boolean
}

export const CategorySection = forwardRef<HTMLElement, Props>(function CategorySection(
  { category, index, dishes, onOpen, onAdd, isInList },
  ref,
) {
  if (!dishes.length) return null
  return (
    <section
      ref={ref}
      data-cat-section={category.id}
      className="mb-section mb-cat-section"
    >
      <header className="mb-section-head">
        <span className="mb-section-eyebrow">— {String(index).padStart(2, '0')}</span>
        <h2 className="mb-section-title">{category.name}</h2>
        <div className="mb-section-count">{copy.section.positions(dishes.length)}</div>
      </header>
      <div className="mb-dish-list">
        {dishes.map((d) => (
          <DishCard
            key={d.id}
            dish={d}
            onOpen={onOpen}
            onAdd={onAdd}
            inList={isInList(d.id)}
          />
        ))}
      </div>
    </section>
  )
})

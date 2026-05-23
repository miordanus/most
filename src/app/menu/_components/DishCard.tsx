'use client'

import type { Dish } from '@/lib/menu/types'
import { DishMedia } from './brand/DishMedia'
import { Icon } from './brand/Icon'
import { copy, fmtNum, fmtPriceWithRub } from '@/menu/copy'

export function DishCard({
  dish,
  onOpen,
  onAdd,
  inList,
}: {
  dish: Dish
  onOpen: (d: Dish) => void
  onAdd: (d: Dish) => void
  inList: boolean
}) {
  return (
    <article
      className={'mb-dish' + (inList ? ' is-in-list' : '')}
      onClick={() => onOpen(dish)}
    >
      <div className="mb-dish-media">
        <DishMedia photo={dish.photo} ratio="3 / 2" markScale={0.55} alt={dish.name} sizes="(max-width: 900px) 50vw, 25vw" />
        {dish.featured && <div className="mb-dish-flag">{copy.card.focusFlag}</div>}
        <button
          className={'mb-dish-add' + (inList ? ' is-in' : '')}
          onClick={(e) => {
            e.stopPropagation()
            onAdd(dish)
          }}
          aria-label={inList ? copy.card.removeAria : copy.card.addAria}
        >
          <Icon name={inList ? 'heart-fill' : 'heart'} size={16} color="#fff" />
        </button>
      </div>

      <div className="mb-dish-body">
        <h3 className="mb-dish-name">{dish.name}</h3>
        {dish.short && <p className="mb-dish-short">{dish.short}</p>}
        <div className="mb-dish-meta-row">
          <div className="mb-dish-meta">
            <span>
              {fmtNum(dish.weight)}
              {copy.detail.nut.g}
            </span>
            <span className="mb-dot" />
            <span>
              {fmtNum(dish.kcal)} {copy.detail.nut.kcal}
            </span>
          </div>
          <div className="mb-dish-price">{fmtPriceWithRub(dish.price)}</div>
        </div>
      </div>
    </article>
  )
}

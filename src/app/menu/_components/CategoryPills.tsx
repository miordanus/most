'use client'

import { useEffect, useRef } from 'react'
import type { Category } from '@/lib/menu/types'

export function CategoryPills({
  categories,
  active,
  onPick,
}: {
  categories: Category[]
  active: string
  onPick: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current.querySelector(`[data-cat="${active}"]`) as HTMLElement | null
    if (el) {
      const parent = ref.current
      const target = el.offsetLeft - parent.clientWidth / 2 + el.clientWidth / 2
      parent.scrollTo({ left: target, behavior: 'smooth' })
    }
  }, [active])

  return (
    <nav className="mb-pills" ref={ref}>
      <div className="mb-pills-inner">
        {categories.map((c) => (
          <button
            key={c.id}
            data-cat={c.id}
            onClick={() => onPick(c.id)}
            className={'mb-pill' + (active === c.id ? ' is-active' : '')}
          >
            {c.name}
          </button>
        ))}
      </div>
    </nav>
  )
}

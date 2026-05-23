'use client'

import type { Category } from '@/lib/menu/types'
import { copy } from '@/menu/copy'

export function DesktopSidebar({
  categories,
  active,
  onPick,
  mode = 'demo',
}: {
  categories: Category[]
  active: string
  onPick: (id: string) => void
  mode?: 'prod' | 'demo'
}) {
  const target = mode === 'prod' ? '/menu' : '/menu?mode=prod'
  const label = mode === 'prod' ? 'демо · только готовое' : 'весь target-меню'
  return (
    <aside className="dk-side">
      <div className="dk-side-inner">
        <div className="dk-side-nav">
          {categories.map((c, i) => (
            <button
              key={c.id}
              data-cat={c.id}
              onClick={() => onPick(c.id)}
              className={'dk-side-item' + (active === c.id ? ' is-active' : '')}
            >
              <span className="dk-side-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="dk-side-name">{c.name}</span>
              <span className="dk-side-tick" />
            </button>
          ))}
        </div>
        <div className="dk-side-foot">
          <div className="dk-side-foot-l">Йошкар-Ола</div>
          <div className="dk-side-foot-l">Воскресенский пр-кт, 17, 2 этаж</div>
          <div className="dk-side-foot-l mb-mono">{copy.footer.phone}</div>
          <div className="dk-side-foot-l">{copy.footer.hours}</div>
          <div className="dk-side-foot-neon">{copy.footer.neon}</div>
          <a href={target} className="mb-mode-switch">{label}</a>
        </div>
      </div>
    </aside>
  )
}

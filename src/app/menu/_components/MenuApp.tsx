'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Category, Dish, ShortlistItem } from '@/lib/menu/types'
import { TopBar } from './TopBar'
import { CategoryPills } from './CategoryPills'
import { FeaturedStrip } from './FeaturedStrip'
import { CategorySection } from './CategorySection'
import { MenuFooter } from './MenuFooter'
import { DishDetailSheet, type AddPayload } from './DishDetailSheet'
import { ShortlistSheet } from './ShortlistSheet'

const STORAGE_KEY = 'most.shortlist.v1'
const TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const DESKTOP_BREAKPOINT = 900

type Stored = { items: ShortlistItem[]; savedAt: number }

function loadItems(): ShortlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Stored
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return parsed.items ?? []
  } catch {
    return []
  }
}

function saveItems(items: ShortlistItem[]) {
  try {
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    const payload: Stored = { items, savedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {}
}

function lineSig(it: { dish: Dish; option: { id: string } | null; addons: { id: string }[]; mods: { id: string }[] }) {
  const a = it.addons.map((x) => x.id).sort().join(',')
  const m = it.mods.map((x) => x.id).sort().join(',')
  const o = it.option ? it.option.id : ''
  return `${it.dish.id}|${o}|${a}|${m}`
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function MenuApp({
  categories,
  dishes,
}: {
  categories: Category[]
  dishes: Dish[]
}) {
  const [active, setActive] = useState(categories[0]?.id ?? '')
  const [activeDish, setActiveDish] = useState<Dish | null>(null)
  const [shortOpen, setShortOpen] = useState(false)
  const [items, setItems] = useState<ShortlistItem[]>([])
  const [isDesktop, setIsDesktop] = useState(false)

  // Hydrate from localStorage on mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setItems(loadItems())
  }, [])

  useEffect(() => {
    saveItems(items)
  }, [items])

  // Viewport detection
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Group dishes by category
  const grouped = useMemo(() => {
    const m: Record<string, Dish[]> = {}
    for (const c of categories) m[c.id] = []
    for (const d of dishes) {
      if (m[d.category]) m[d.category].push(d)
    }
    return m
  }, [categories, dishes])

  // Only categories with at least one dish are navigable / rendered.
  const visibleCategories = useMemo(
    () => categories.filter((c) => (grouped[c.id]?.length ?? 0) > 0),
    [categories, grouped],
  )

  const featured = useMemo(() => dishes.filter((d) => d.featured), [dishes])

  // Section refs for scroll-spy + scroll-to
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const setSectionRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el
    },
    [],
  )

  const handlePickCategory = useCallback((id: string) => {
    setActive(id)
    const target = document.querySelector<HTMLElement>(
      `[data-cat-section="${id}"]`,
    )
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Scroll-spy: window scroll
  useEffect(() => {
    let raf: number | null = null
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const y = window.scrollY + 140
        let cur = visibleCategories[0]?.id ?? ''
        for (const c of visibleCategories) {
          const el = sectionRefs.current[c.id]
          if (el && el.offsetTop <= y) cur = c.id
        }
        setActive((prev) => (prev === cur ? prev : cur))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [visibleCategories])

  const inListIds = useMemo(() => new Set(items.map((it) => it.dish.id)), [items])
  const totalCount = items.reduce((s, it) => s + it.qty, 0)

  const addToList = useCallback((line: Omit<ShortlistItem, 'uid' | 'qty'>) => {
    setItems((prev) => {
      const sig = lineSig(line)
      const idx = prev.findIndex((it) => lineSig(it) === sig)
      if (idx >= 0) {
        const copy = prev.slice()
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 }
        return copy
      }
      return [...prev, { ...line, uid: uid(), qty: 1 }]
    })
  }, [])

  const handleAddQuick = useCallback(
    (dish: Dish) => {
      const opt = dish.options
        ? dish.options.options.find((o) => o.default) ?? dish.options.options[0]
        : null
      addToList({
        dish,
        addons: [],
        mods: [],
        option: opt,
        lineTotal: dish.price ?? 0,
      })
    },
    [addToList],
  )

  const handleAddFromDetail = useCallback(
    (p: AddPayload) => {
      addToList(p)
    },
    [addToList],
  )

  const inc = useCallback(
    (id: string) =>
      setItems((p) => p.map((it) => (it.uid === id ? { ...it, qty: it.qty + 1 } : it))),
    [],
  )
  const dec = useCallback(
    (id: string) =>
      setItems((p) =>
        p
          .map((it) => (it.uid === id ? { ...it, qty: it.qty - 1 } : it))
          .filter((it) => it.qty > 0),
      ),
    [],
  )
  const clearAll = useCallback(() => setItems([]), [])

  return (
    <div className={'menu-app ' + (isDesktop ? 'is-desktop' : 'is-mobile')}>
      <div className="mb-stick">
        <TopBar
          onOpenShortlist={() => setShortOpen(true)}
          listCount={totalCount}
          wordmarkSize={isDesktop ? 28 : 20}
        />
        <CategoryPills
          categories={visibleCategories}
          active={active}
          onPick={handlePickCategory}
        />
      </div>

      <div className="mb-content">
        <FeaturedStrip dishes={featured} onOpen={setActiveDish} />
        {visibleCategories.map((c, i) => (
          <CategorySection
            key={c.id}
            ref={setSectionRef(c.id)}
            category={c}
            index={i + 1}
            dishes={grouped[c.id] ?? []}
            onOpen={setActiveDish}
            onAdd={handleAddQuick}
            isInList={(id) => inListIds.has(id)}
          />
        ))}
        <MenuFooter />
        <div style={{ height: 120 }} />
      </div>

      <DishDetailSheet
        dish={activeDish}
        open={!!activeDish}
        onClose={() => setActiveDish(null)}
        onAddToList={handleAddFromDetail}
        variant={isDesktop ? 'modal' : 'sheet'}
      />

      <ShortlistSheet
        open={shortOpen}
        onClose={() => setShortOpen(false)}
        items={items}
        onInc={inc}
        onDec={dec}
        onClear={clearAll}
        variant={isDesktop ? 'drawer' : 'sheet'}
      />
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { fuzzyMatch } from '@/lib/menu/normalize'

type ManifestEntry = {
  staged: string
  source: string
  matched_dish_id: string | null
}
type Category = { id: string; name: string; sort_order: number }
type Dish = {
  id: string
  name: string
  category: string
  price: number | null
  photo_url: string | null
}

export function PhotoMatchClient({
  token,
  manifest: initialManifest,
  categories,
  dishes,
}: {
  token: string
  manifest: ManifestEntry[]
  categories: Category[]
  dishes: Dish[]
}) {
  const [manifest, setManifest] = useState(initialManifest)
  const [cursor, setCursor] = useState(() =>
    manifest.findIndex((e) => !e.matched_dish_id),
  )
  const [query, setQuery] = useState('')
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Cropper state — react-easy-crop's onCropComplete fires with pixel coords
  // against the source image, which is exactly what the apply API wants.
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropPixels, setCropPixels] = useState<Area | null>(null)
  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCropPixels(pixels)
  }, [])

  const total = manifest.length
  const matched = manifest.filter((e) => e.matched_dish_id).length
  const current = cursor >= 0 ? manifest[cursor] : null

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string) => m.get(id) ?? id
  }, [categories])

  const filtered = useMemo(() => {
    if (!query.trim()) return dishes.slice(0, 30)
    return dishes.filter((d) => fuzzyMatch(`${d.name} ${catName(d.category)}`, query)).slice(0, 30)
  }, [dishes, query, catName])

  useEffect(() => {
    inputRef.current?.focus()
  }, [cursor])

  function advance() {
    setQuery('')
    setSelectedDishId(null)
    setCropPos({ x: 0, y: 0 })
    setZoom(1)
    setCropPixels(null)
    const next = manifest.findIndex((e, i) => i > cursor && !e.matched_dish_id)
    setCursor(next)
  }

  async function applyMatch(dishId: string, replace = false) {
    if (!current) return
    setStatus('uploading…')
    const crop = cropPixels
      ? { x: cropPixels.x, y: cropPixels.y, w: cropPixels.width, h: cropPixels.height }
      : undefined
    const res = await fetch('/api/admin/photo-match/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-photo-admin-token': token },
      body: JSON.stringify({ staged_filename: current.staged, dish_id: dishId, replace, crop }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(`error: ${data.error ?? res.status}`)
      return
    }
    setStatus('matched')
    setManifest((m) =>
      m.map((e, i) => (i === cursor ? { ...e, matched_dish_id: dishId } : e)),
    )
    advance()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      const target = selectedDishId ?? filtered[0].id
      const dish = dishes.find((d) => d.id === target)
      if (dish?.photo_url) {
        if (!confirm(`«${dish.name}» уже имеет фото. Заменить?`)) return
        applyMatch(target, true)
      } else {
        applyMatch(target)
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      advance()
    }
  }

  if (!current) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Все фото сматчены</h1>
        <p>
          {matched} / {total} matched.
        </p>
        <p>
          Можно удалить <code>tmp/photos-staged/</code>.
        </p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 760 }}>
      <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>
        {matched} / {total} matched · {current.source}
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          aspectRatio: '3 / 2',
          background: '#111',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <Cropper
          key={current.staged}
          image={`/api/admin/photo-match/preview?file=${encodeURIComponent(current.staged)}&t=${encodeURIComponent(token)}`}
          crop={cropPos}
          zoom={zoom}
          aspect={3 / 2}
          showGrid={true}
          onCropChange={setCropPos}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#666' }}>
        <span>zoom</span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ width: 40, textAlign: 'right' }}>{zoom.toFixed(2)}×</span>
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setSelectedDishId(null)
        }}
        onKeyDown={onKeyDown}
        placeholder="Поиск блюда…"
        style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 8 }}
      />
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          maxHeight: 320,
          overflow: 'auto',
          border: '1px solid #eee',
        }}
      >
        {filtered.map((d) => {
          const isPicked = selectedDishId === d.id
          return (
            <li
              key={d.id}
              onClick={() => setSelectedDishId(d.id)}
              onDoubleClick={() => {
                if (d.photo_url && !confirm(`«${d.name}» уже имеет фото. Заменить?`)) return
                applyMatch(d.id, !!d.photo_url)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: isPicked ? '#ffd' : 'transparent',
                opacity: d.photo_url ? 0.55 : 1,
                borderBottom: '1px solid #f4f4f4',
              }}
            >
              <strong>{d.name}</strong>
              <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>
                · {catName(d.category)}
                {d.price != null ? ` · ${d.price} ₽` : ''}
                {d.photo_url ? ' · [есть фото — replace?]' : ''}
              </span>
            </li>
          )
        })}
      </ul>
      <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
        Enter — применить выбор · → пропустить · status: {status || 'idle'}
      </div>
    </main>
  )
}

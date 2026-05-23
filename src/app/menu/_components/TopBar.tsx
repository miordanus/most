'use client'

import { Wordmark } from './brand/Wordmark'
import { HeartCounter } from './brand/HeartCounter'
import { copy } from '@/menu/copy'

export function TopBar({
  onOpenShortlist,
  listCount,
  wordmarkSize = 20,
}: {
  onOpenShortlist: () => void
  listCount: number
  wordmarkSize?: number
}) {
  const hasItems = listCount > 0
  return (
    <div className="mb-topbar">
      <div className="mb-topbar-left">
        <Wordmark size={wordmarkSize} />
      </div>
      <button
        className={'mb-fav-btn' + (hasItems ? ' has-items' : '')}
        onClick={onOpenShortlist}
        aria-label={copy.topbar.favoritesAria(listCount)}
      >
        <HeartCounter count={listCount} size={wordmarkSize + 12} color="currentColor" />
        <span className="mb-fav-label">{copy.topbar.favorites}</span>
      </button>
    </div>
  )
}

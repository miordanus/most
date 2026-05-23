import type { CSSProperties } from 'react'

const MARK_SRC = '/assets/most_mark.png'
const RATIO = 1605 / 1875

export function ArchMark({
  size = 40,
  style,
  ariaLabel = 'МОСТ',
}: {
  size?: number
  style?: CSSProperties
  ariaLabel?: string
}) {
  return (
    <img
      src={MARK_SRC}
      width={size * RATIO}
      height={size}
      alt={ariaLabel}
      style={{ display: 'inline-block', objectFit: 'contain', ...style }}
      draggable={false}
    />
  )
}

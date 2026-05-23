import type { CSSProperties } from 'react'

// Single-image wordmark — pixel-perfect match of the brand PDF.
// The PNG is white + red on transparent; render at a fixed pixel height
// so the topbar can scale it just like the previous composed version.
const WORDMARK_SRC = '/assets/wordmark.png'
const RATIO = 2400 / 1240 // matches the rendered file in public/assets

export function Wordmark({
  size = 22,
  style,
}: {
  size?: number
  style?: CSSProperties
}) {
  const height = size * 1.6
  const width = height * RATIO

  return (
    <img
      src={WORDMARK_SRC}
      alt="МОСТ"
      width={width}
      height={height}
      style={{
        display: 'inline-block',
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
      draggable={false}
    />
  )
}

import type { CSSProperties } from 'react'

const MARK_SRC = '/assets/most_mark.png'
const RATIO = 1605 / 1875

export function Wordmark({
  size = 22,
  style,
}: {
  size?: number
  style?: CSSProperties
}) {
  const fontSize = size / 0.74
  const markHeight = size * 1.18
  const markWidth = markHeight * RATIO

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        color: 'var(--text-1)',
        letterSpacing: '-0.02em',
        ...style,
      }}
      aria-label="МОСТ"
    >
      <span>М</span>
      <img
        src={MARK_SRC}
        alt=""
        width={markWidth}
        height={markHeight}
        style={{
          display: 'inline-block',
          marginInline: size * 0.03,
          objectFit: 'contain',
          flexShrink: 0,
        }}
        draggable={false}
      />
      <span>СТ</span>
    </div>
  )
}

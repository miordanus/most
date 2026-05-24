import type { CSSProperties } from 'react'

const SRC = '/assets/wordmark.png'

export function Wordmark({
  size = 22,
  style,
}: {
  size?: number
  style?: CSSProperties
}) {
  return (
    <img
      src={SRC}
      alt="МОСТ"
      style={{
        display: 'inline-block',
        height: size * 1.2,
        width: 'auto',
        ...style,
      }}
      draggable={false}
    />
  )
}

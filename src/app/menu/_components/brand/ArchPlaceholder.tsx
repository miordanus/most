import type { CSSProperties } from 'react'

const MARK_SRC = '/assets/most_mark.png'

export function ArchPlaceholder({
  ratio = '3 / 2',
  markScale = 0.5,
  style,
}: {
  ratio?: string
  markScale?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: ratio,
        background: 'var(--card-2)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.3,
        }}
      />
      <img
        src={MARK_SRC}
        alt=""
        style={{
          height: `${markScale * 100}%`,
          opacity: 0.15,
          position: 'relative',
          zIndex: 1,
          objectFit: 'contain',
        }}
        draggable={false}
      />
    </div>
  )
}

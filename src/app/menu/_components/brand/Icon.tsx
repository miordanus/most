export type IconName =
  | 'plus' | 'minus' | 'check' | 'x'
  | 'chev-down' | 'list' | 'heart' | 'heart-fill'

export function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.6,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}) {
  const p = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'plus':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" {...p} />
        </svg>
      )
    case 'minus':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M5 12h14" {...p} />
        </svg>
      )
    case 'check':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M4 12l5 5L20 6" {...p} />
        </svg>
      )
    case 'x':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" {...p} />
        </svg>
      )
    case 'chev-down':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" {...p} />
        </svg>
      )
    case 'list':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h10" {...p} />
        </svg>
      )
    case 'heart':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M20.5 7.6c0-2.3-1.9-4.1-4.2-4.1-1.5 0-2.8.7-3.6 1.9-.8-1.2-2.1-1.9-3.6-1.9-2.3 0-4.2 1.8-4.2 4.1 0 4 4.8 7.7 7.8 10.4 3-2.7 7.8-6.4 7.8-10.4z"
            {...p}
          />
        </svg>
      )
    case 'heart-fill':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M20.5 7.6c0-2.3-1.9-4.1-4.2-4.1-1.5 0-2.8.7-3.6 1.9-.8-1.2-2.1-1.9-3.6-1.9-2.3 0-4.2 1.8-4.2 4.1 0 4 4.8 7.7 7.8 10.4 3-2.7 7.8-6.4 7.8-10.4z"
            fill={color}
            stroke="none"
          />
        </svg>
      )
  }
}

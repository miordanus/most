export function HeartCounter({
  count = 0,
  size = 32,
  color = 'currentColor',
  strokeWidth = 1.8,
}: {
  count?: number
  size?: number
  color?: string
  strokeWidth?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block' }}>
      <path
        d="M16 27L14.5 25.7C8.6 20.4 4.5 16.6 4.5 12.1C4.5 8.5 7.4 5.5 11 5.5C13 5.5 15 6.5 16 8.1C17 6.5 19 5.5 21 5.5C24.6 5.5 27.5 8.5 27.5 12.1C27.5 16.6 23.4 20.4 17.5 25.7L16 27Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <text
        x="16"
        y="14.7"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-jetbrains), 'JetBrains Mono', monospace"
        fontWeight={600}
        fontSize={13}
        fill={color}
      >
        {count}
      </text>
    </svg>
  )
}

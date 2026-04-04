interface ContactCardProps {
  label: string
  value: string
  sub?: string
  href?: string
}

export default function ContactCard({ label, value, sub, href }: ContactCardProps) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '18px 22px',
        minWidth: 190,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1.45,
        }}
      >
        {href ? (
          <a
            href={href}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.7')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
          >
            {value}
          </a>
        ) : value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

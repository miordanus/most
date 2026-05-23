import { ArchMark } from './brand/ArchMark'
import { copy } from '@/menu/copy'

export function MenuFooter({ mode = 'prod' }: { mode?: 'prod' | 'demo' }) {
  // tiny opt-in toggle — invisible to guests who don't know the URL,
  // discoverable by anyone who scrolls to the bottom.
  const target = mode === 'demo' ? '/menu' : '/menu?mode=demo'
  const label = mode === 'demo' ? 'демо · только готовое' : 'весь target-меню'
  return (
    <footer className="mb-footer">
      <ArchMark size={56} style={{ opacity: 0.35 }} />
      <div className="mb-footer-name">{copy.footer.brand}</div>
      <div className="mb-footer-line">{copy.footer.address}</div>
      <div className="mb-footer-line mb-mono">tel {copy.footer.phone}</div>
      <div className="mb-footer-neon">{copy.footer.neon}</div>
      <a href={target} className="mb-mode-switch">{label}</a>
    </footer>
  )
}

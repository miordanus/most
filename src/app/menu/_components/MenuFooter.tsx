import { ArchMark } from './brand/ArchMark'
import { copy } from '@/menu/copy'

export function MenuFooter() {
  return (
    <footer className="mb-footer">
      <ArchMark size={56} style={{ opacity: 0.35 }} />
      <div className="mb-footer-name">{copy.footer.brand}</div>
      <div className="mb-footer-line">{copy.footer.address}</div>
      <div className="mb-footer-line mb-mono">tel {copy.footer.phone}</div>
      <div className="mb-footer-line">{copy.footer.hours.weekday}</div>
      <div className="mb-footer-line">{copy.footer.hours.weekend}</div>
      <div className="mb-footer-neon">{copy.footer.neon}</div>
    </footer>
  )
}

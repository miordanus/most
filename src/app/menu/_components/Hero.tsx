import { copy } from '@/menu/copy'

export function Hero() {
  return (
    <div className="mb-hero">
      <div className="mb-hero-eyebrow">{copy.hero.eyebrow}</div>
      <div className="mb-hero-line">{copy.hero.subline}</div>
    </div>
  )
}

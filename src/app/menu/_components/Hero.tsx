import { copy } from '@/menu/copy'

export function Hero() {
  return (
    <div className="mb-hero">
      <div className="mb-hero-eyebrow">{copy.hero.eyebrow}</div>
      <h1 className="mb-hero-title">
        {copy.hero.headlineLines.map((line, i) => (
          <span key={i}>
            {line}
            {i < copy.hero.headlineLines.length - 1 && <br />}
          </span>
        ))}
      </h1>
      <div className="mb-hero-line">{copy.hero.subline}</div>
    </div>
  )
}

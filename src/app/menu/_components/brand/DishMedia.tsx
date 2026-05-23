import Image from 'next/image'
import { ArchPlaceholder } from './ArchPlaceholder'

export function DishMedia({
  photo,
  ratio = '3 / 2',
  markScale = 0.55,
  alt = '',
  sizes,
}: {
  photo: string | null
  ratio?: string
  markScale?: number
  alt?: string
  sizes?: string
}) {
  if (!photo) {
    return <ArchPlaceholder ratio={ratio} markScale={markScale} />
  }
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: ratio,
        position: 'relative',
        background: 'var(--card-2)',
        overflow: 'hidden',
      }}
    >
      <Image
        src={photo}
        alt={alt}
        fill
        sizes={sizes ?? '(max-width: 900px) 50vw, 33vw'}
        style={{ objectFit: 'cover' }}
        unoptimized={false}
      />
    </div>
  )
}

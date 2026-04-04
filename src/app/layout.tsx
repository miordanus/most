import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'МОСТ — Рестобар',
  description: 'Рестобар с характером. Воскресенский пр-кт, 17, Йошкар-Ола.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

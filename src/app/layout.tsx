import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'МОСТ — Рестобар',
  description: 'Рестобар с характером. Воскресенский пр-кт, 17, Йошкар-Ола.',
  icons: {
    icon: [{ url: '/assets/most_mark.png', type: 'image/png' }],
    shortcut: '/assets/most_mark.png',
    apple: '/assets/most_mark.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

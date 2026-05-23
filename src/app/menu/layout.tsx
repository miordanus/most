import type { Metadata } from 'next'
import { Montserrat, JetBrains_Mono } from 'next/font/google'
import './menu.css'

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'МОСТ — Меню',
  description: 'Меню рестобара МОСТ. Йошкар-Ола, Воскресенский пр-кт, 17.',
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${montserrat.variable} ${jetbrains.variable} menu-root`}>
      {children}
    </div>
  )
}

import type { Metadata } from 'next'
import './menu.css'

export const metadata: Metadata = {
  title: 'МОСТ — Меню',
  description: 'Меню рестобара МОСТ. Йошкар-Ола, Воскресенский пр-кт, 17.',
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Browser-loaded Google Fonts. Build-time fetch (next/font/google) fails on
          Amvera build env which can't reach Google. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap&subset=cyrillic,latin"
        rel="stylesheet"
      />
      <div className="menu-root">{children}</div>
    </>
  )
}

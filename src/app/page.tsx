import Background from '@/components/Background'
import ContactCard from '@/components/ContactCard'

const BUTTONS = [
  {
    label: 'Яндекс Карты',
    href: 'https://yandex.ru/maps/org/restobar_most/30178271907/',
    primary: true,
    external: true,
  },
  {
    label: '2ГИС',
    href: 'https://2gis.ru/yoshkarola/firm/70000001096959804?m=47.910596%2C56.632813%2F16',
    primary: false,
    external: true,
  },
]

export default function Home() {
  return (
    <>
      <Background />

      <div className="page-wrap">
        <main className="main">

          {/* WORDMARK — дизайнерский PNG */}
          <div style={{ marginBottom: 14 }}>
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/assets/wordmark.png`}
              alt="МОСТ"
              className="wordmark"
            />
          </div>

          {/* TAGLINE */}
          <p className="tagline">Рестобар с характером</p>

          {/* CONTACT CARDS */}
          <div className="cards" role="list">
            <div role="listitem">
              <ContactCard label="Адрес" value="Воскресенский проспект, 17" sub="2 этаж, Йошкар-Ола" />
            </div>
            <div role="listitem">
              <ContactCard label="Часы работы" value="Вс–Чт: 12:00–23:00" sub="Пт–Сб: 12:00–01:00" />
            </div>
            <div role="listitem">
              <ContactCard label="Бронирование" value="+7 (8362) 48-17-17" sub="звонки принимаются с 12:00" href="tel:+78362481717" />
            </div>
          </div>

          {/* CTA BUTTONS */}
          <nav className="buttons" aria-label="Карты и контакты">
            {BUTTONS.map(({ label, href, primary, external }) => (
              <a
                key={label}
                href={href}
                className={primary ? 'btn btn-primary' : 'btn btn-ghost'}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* MANAGER — secondary */}
          <p className="manager">
            Написать управляющей: Мария —{' '}
            <a href="mailto:dir@restobarmost.ru" className="manager-link">
              dir@restobarmost.ru
            </a>
          </p>

        </main>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-inner">
            <span className="footer-name">ООО «Подходяще»</span>
            <span className="footer-item">ОГРН&nbsp;1241200002955</span>
            <span className="footer-item">ИНН&nbsp;1200016105</span>
            <span className="footer-item">
              424033, Республика Марий Эл, г. Йошкар-Ола, Воскресенский пр-кт, д. 17, эт. 2
            </span>
          </div>
        </footer>
      </div>
    </>
  )
}

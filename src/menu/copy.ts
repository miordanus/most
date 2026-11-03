export const copy = {
  topbar: {
    favorites: 'избранное',
    favoritesAria: (n: number) => `Избранное (${n})`,
    count: (n: number) => (n > 0 ? ` · ${n}` : ''),
  },
  hero: {
    eyebrow: 'МЕНЮ · ВЕЧЕР',
    headlineLines: ['Добрый вечер.', 'Архитектура вкуса.'],
    subline: 'Кухня · вс–чт до 22:00 · пт–сб до 00:00',
  },
  featured: {
    sectionTitle: 'Сейчас в фокусе',
    badge: 'Шеф рекомендует',
  },
  card: {
    addAria: 'В избранное',
    removeAria: 'В избранном',
    per100: '/100 г',
    approx: '~',
  },
  section: {
    positions: (n: number) => `${n} позиций`,
  },
  detail: {
    cta: 'Добавить в избранное',
    close: 'Закрыть',
    required: 'обязательно',
    sections: {
      ingredients: 'Состав',
      options: 'Прожарка',
      addons: 'Дополнения',
      mods: 'Модификации',
    },
    weighNote: (w: number | null) =>
      w
        ? `Цена за 100 г. Порция около ${w} г — можно попросить побольше или поменьше, точный вес назовёт официант.`
        : 'Цена за 100 г. Вес порции уточните у официанта.',
    nut: { g: 'г', kcal: 'ккал', protein: 'бел.', fat: 'жир.', carbs: 'угл.', bzu: 'бжу' },
  },
  short: {
    eyebrow: '— избранное к столу',
    headline: 'Покажите официанту',
    bannerTitle: 'Дождитесь официанта',
    bannerSub: 'Покажите этот список — мы примем заказ. Это не онлайн-заказ.',
    clear: 'Очистить избранное',
    emptyTitle: 'Пока пусто',
    emptySub: 'Добавляйте блюда в избранное — официант примет заказ по нему.',
    qtyDecAria: 'Меньше',
    qtyIncAria: 'Больше',
    total: 'Итого',
    totalApprox: 'Примерно',
    approxNote: 'Блюда на гриле посчитаны по примерному весу. Точную сумму назовёт официант.',
    unpricedNote: 'Без блюд с ценой за 100 г — их вес уточните у официанта.',
    weighUnknown: 'вес уточните',
  },
  footer: {
    brand: 'МОСТ · РЕСТОБАР',
    address: 'Йошкар-Ола · Воскресенский пр-кт, 17, 2 этаж',
    phone: '+7 (8362) 48-17-17',
    hours: {
      weekday: 'Кухня · вс–чт до 22:00',
      weekend: 'пт–сб до 00:00',
    },
    neon: 'NICE TO MEAT YOU',
  },
  rub: '₽',
  placeholder: {
    dash: '—',
    addonsEmpty: 'уточняйте у официанта',
    priceEmpty: 'уточняйте',
  },
} as const

export function fmtPrice(n: number | null | undefined): string {
  if (n == null || n === 0) return copy.placeholder.dash
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function fmtPriceWithRub(n: number | null | undefined): string {
  if (n == null || n === 0) return copy.placeholder.priceEmpty
  return `${fmtPrice(n)} ${copy.rub}`
}

export function fmtApproxRub(n: number): string {
  return `≈ ${fmtPriceWithRub(n)}`
}

export function fmtNum(n: number | null | undefined): string {
  return n == null || n === 0 ? copy.placeholder.dash : String(n)
}

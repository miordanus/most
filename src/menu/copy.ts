export const copy = {
  topbar: {
    favorites: 'избранное',
    favoritesAria: (n: number) => `Избранное (${n})`,
  },
  hero: {
    eyebrow: 'МЕНЮ · ВЕЧЕР',
    headlineLines: ['Добрый вечер.', 'Архитектура вкуса.'],
    subline: 'Кухня работает до 23:30 · Бар — до полуночи',
  },
  featured: {
    sectionTitle: 'Сейчас в фокусе',
    badge: 'Шеф рекомендует',
  },
  card: {
    focusFlag: 'в фокусе',
    addAria: 'В избранное',
    removeAria: 'В избранном',
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
    nut: { g: 'г', kcal: 'ккал', protein: 'бел.', fat: 'жир.', carbs: 'угл.' },
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
  },
  footer: {
    brand: 'МОСТ · РЕСТОБАР',
    address: 'Йошкар-Ола · Воскресенский пр-кт, 17, 2 этаж',
    phone: '+7 (8362) 48-17-17',
    hours: 'Кухня до 23:30',
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

export function fmtNum(n: number | null | undefined): string {
  return n == null || n === 0 ? copy.placeholder.dash : String(n)
}

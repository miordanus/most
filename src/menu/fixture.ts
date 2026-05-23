import type { Category, Dish, OptionGroup, Addon, Mod } from '@/lib/menu/types'

export const fixtureCategories: Category[] = [
  { id: 'start', name: 'Старт', sort_order: 10 },
  { id: 'salads', name: 'Салаты', sort_order: 20 },
  { id: 'soups', name: 'Супы', sort_order: 30 },
  { id: 'mains', name: 'Основные', sort_order: 40 },
  { id: 'burgers', name: 'Бургеры', sort_order: 45 },
  { id: 'grill', name: 'Гриль', sort_order: 50 },
  { id: 'desserts', name: 'Десерты', sort_order: 60 },
  { id: 'bar', name: 'Бар', sort_order: 70 },
]

function donenessGroup(defaultLevel: 'rare' | 'medium-rare' | 'medium'): OptionGroup {
  return {
    label: 'Прожарка',
    required: true,
    options: [
      { id: 'doneness-rare', name: 'Rare', sub: 'с кровью', default: defaultLevel === 'rare' },
      { id: 'doneness-medium-rare', name: 'Medium rare', sub: 'розовый центр', default: defaultLevel === 'medium-rare' },
      { id: 'doneness-medium', name: 'Medium', sub: 'розовая полоса', default: defaultLevel === 'medium' },
      { id: 'doneness-medium-well', name: 'Medium well', sub: 'почти прожарен', default: false },
      { id: 'doneness-well-done', name: 'Well done', sub: 'полная прожарка', default: false },
    ],
  }
}

const burgerAddons: Addon[] = [
  { id: 'addon-jalapeno', name: 'Халапеньо', price: 90 },
  { id: 'addon-bacon', name: 'Бекон', price: 180 },
  { id: 'addon-avocado', name: 'Авокадо', price: 220 },
  { id: 'addon-double-patty', name: 'Двойная котлета', price: 390 },
  { id: 'addon-cheddar', name: 'Чеддер', price: 120 },
  { id: 'addon-fried-egg', name: 'Жареное яйцо', price: 90 },
]

const burgerMods: Mod[] = [
  { id: 'mod-no-onion', name: 'Без лука', price: 0 },
  { id: 'mod-no-tomato', name: 'Без помидора', price: 0 },
  { id: 'mod-no-pickle', name: 'Без огурца', price: 0 },
  { id: 'mod-no-sauce', name: 'Без соуса', price: 0 },
  { id: 'mod-no-bun', name: 'Без булочки', price: 0 },
]

function dish(d: Partial<Dish> & Pick<Dish, 'id' | 'category' | 'name'>): Dish {
  return {
    short: '',
    desc: '',
    price: null,
    weight: null,
    weightLabel: null,
    kcal: null,
    protein: null,
    fat: null,
    carbs: null,
    ingredients: '',
    photo: null,
    featured: false,
    addons: [],
    mods: [],
    options: null,
    ...d,
  }
}

export const fixtureDishes: Dish[] = [
  // ───────── Старт ─────────
  dish({
    id: 'start-tartar', category: 'start', name: 'Тартар из говядины', featured: true,
    short: 'вырезка, желток, каперсы',
    desc: 'Ножевая рубка из мраморной вырезки, классическая подача с желтком и хрустящей чиабаттой.',
    ingredients: 'говяжья вырезка, желток, дижонская горчица, каперсы, корнишоны, лук-шалот, оливковое масло, чиабатта',
    weight: 180, kcal: 540, protein: 38, fat: 30, carbs: 12, price: 890,
  }),
  dish({
    id: 'start-ceviche', category: 'start', name: 'Севиче из дорадо',
    short: 'цитрус, перец чили, кинза',
    desc: 'Дорадо в маринаде из лайма и юдзу, с тонкими ломтиками перца и луком-шалотом.',
    ingredients: 'филе дорадо, лайм, юдзу, красный лук, перец чили, кинза, оливковое масло',
    weight: 150, kcal: 280, protein: 26, fat: 14, carbs: 6, price: 720,
  }),
  dish({
    id: 'start-hummus-lamb', category: 'start', name: 'Хумус с бараниной',
    short: 'нут, тахини, рваная баранина',
    desc: 'Тёплый хумус под томлёной бараниной с зирой и кедровыми орехами, лепёшка пита.',
    ingredients: 'нут, тахини, оливковое масло, лимон, баранина, зира, кедровый орех, пита',
    weight: 220, kcal: 480, protein: 24, fat: 26, carbs: 30, price: 590,
  }),
  dish({
    id: 'start-beet-carpaccio', category: 'start', name: 'Карпаччо из свёклы',
    short: 'козий сыр, груша, грецкий орех',
    desc: 'Тонкие лепестки печёной свёклы, козий сыр, груша и медово-горчичная заправка.',
    ingredients: 'свёкла, козий сыр, груша, грецкий орех, мёд, дижонская горчица, оливковое масло',
    weight: 160, kcal: 320, protein: 12, fat: 22, carbs: 18, price: 520,
  }),

  // ───────── Салаты ─────────
  dish({
    id: 'salad-caesar-shrimp', category: 'salads', name: 'Цезарь с креветкой',
    short: 'тигровая креветка, романо, пармезан',
    desc: 'Романо, обжаренная тигровая креветка, гренки на ржаной закваске и классический соус.',
    ingredients: 'салат романо, тигровая креветка, пармезан, ржаной хлеб, анчоус, чеснок, желток, оливковое масло',
    weight: 240, kcal: 420, protein: 28, fat: 24, carbs: 16, price: 690,
  }),
  dish({
    id: 'salad-roastbeef', category: 'salads', name: 'Салат с ростбифом',
    short: 'ростбиф, корнишоны, руккола',
    desc: 'Тонко нарезанный ростбиф slow-cooked, руккола, томаты черри и горчичная заправка.',
    ingredients: 'говяжья вырезка, руккола, томаты черри, корнишоны, каперсы, дижонская горчица, оливковое масло',
    weight: 230, kcal: 460, protein: 32, fat: 26, carbs: 12, price: 740,
  }),
  dish({
    id: 'salad-quinoa-bowl', category: 'salads', name: 'Боул с авокадо и киноа',
    short: 'киноа, авокадо, эдамаме, мисо',
    desc: 'Тёплое киноа, авокадо, эдамаме и редис, заправка на основе мисо и кунжутного масла.',
    ingredients: 'киноа, авокадо, эдамаме, редис, морковь, мисо, кунжутное масло, нори',
    weight: 280, kcal: 520, protein: 18, fat: 28, carbs: 48, price: 620,
  }),

  // ───────── Супы ─────────
  dish({
    id: 'soup-tom-yum', category: 'soups', name: 'Том ям с креветкой',
    short: 'кокос, лемонграсс, креветка',
    desc: 'Кокосовая база, лемонграсс, галангал, листья каффир-лайма, тигровая креветка.',
    ingredients: 'кокосовое молоко, лемонграсс, галангал, каффир-лайм, паста том ям, креветка, грибы шиитаке, кинза',
    weight: 350, kcal: 380, protein: 18, fat: 22, carbs: 14, price: 590,
  }),
  dish({
    id: 'soup-bisque', category: 'soups', name: 'Биск из лангустинов',
    short: 'лангустин, коньяк, эстрагон',
    desc: 'Густой крем-суп на панцирях лангустинов с лёгкой ноткой коньяка.',
    ingredients: 'лангустин, рыбный бульон, сливки, коньяк, томат, эстрагон, морковь, сельдерей',
    weight: 300, kcal: 420, protein: 22, fat: 26, carbs: 12, price: 690,
  }),
  dish({
    id: 'soup-borsch', category: 'soups', name: 'Борщ на углях',
    short: 'томлёная говядина, сметана, бородинский',
    desc: 'Свёкла и говяжья грудинка, томлённые на углях, подаётся со сметаной и тёплым бородинским.',
    ingredients: 'свёкла, говяжья грудинка, капуста, морковь, томат, сметана, чеснок, бородинский хлеб',
    weight: 350, kcal: 360, protein: 20, fat: 16, carbs: 22, price: 490,
  }),

  // ───────── Основные ─────────
  dish({
    id: 'main-risotto', category: 'mains', name: 'Ризотто с белыми грибами',
    short: 'карнароли, пармезан, трюфельное масло',
    desc: 'Рис карнароли на бульоне из белых грибов, финиш — пармезан и капля трюфельного масла.',
    ingredients: 'рис карнароли, белые грибы, пармезан, белое вино, лук-шалот, сливочное масло, трюфельное масло',
    weight: 260, kcal: 580, protein: 16, fat: 26, carbs: 62, price: 790,
  }),
  dish({
    id: 'main-cacio-e-pepe', category: 'mains', name: 'Паста качо э пепе',
    short: 'тоннарелли, пекорино, чёрный перец',
    desc: 'Свежая паста тоннарелли, пекорино романо и крупно молотый перец — три ингредиента, ничего лишнего.',
    ingredients: 'тоннарелли, пекорино романо, чёрный перец, оливковое масло',
    weight: 240, kcal: 620, protein: 22, fat: 28, carbs: 68, price: 640,
  }),
  dish({
    id: 'main-duck-confit', category: 'mains', name: 'Утиная ножка конфи',
    short: 'томлёная утка, корнеплоды, портвейн',
    desc: 'Утиная ножка томится 8 часов в собственном жире, с печёными корнеплодами и соусом на портвейне.',
    ingredients: 'утиная ножка, утиный жир, морковь, пастернак, репа, портвейн, тимьян, чеснок',
    weight: 280, kcal: 720, protein: 36, fat: 52, carbs: 14, price: 890,
  }),

  // ───────── Бургеры ─────────
  dish({
    id: 'burger-most', category: 'burgers', name: 'Чизбургер МОСТ', featured: true,
    short: 'блэк ангус, чеддер, бекон',
    desc: 'Котлета из мраморной говядины 180 г, двойной чеддер, бекон, томлёный лук, бриошь.',
    ingredients: 'говяжий фарш блэк ангус, чеддер, бекон, лук, томат, огурец, бриошь, фирменный соус',
    weight: 320, kcal: 820, protein: 42, fat: 46, carbs: 48, price: 790,
    options: donenessGroup('medium'), addons: burgerAddons, mods: burgerMods,
  }),
  dish({
    id: 'burger-brisket', category: 'burgers', name: 'Бургер с томлёной грудинкой',
    short: '12 часов на углях, BBQ, маринованный лук',
    desc: 'Говяжья грудинка томится 12 часов, BBQ-соус на бурбоне, маринованный красный лук, бриошь.',
    ingredients: 'говяжья грудинка, BBQ-соус, бурбон, красный лук, корнишоны, бриошь',
    weight: 340, kcal: 880, protein: 38, fat: 42, carbs: 62, price: 890,
    addons: burgerAddons, mods: burgerMods,
  }),
  dish({
    id: 'burger-chicken', category: 'burgers', name: 'Куриный бургер',
    short: 'хрустящая курица, слайв, сирача-майо',
    desc: 'Куриное бедро в хрустящей панировке, слайв из капусты, соус сирача-майо.',
    ingredients: 'куриное бедро, мука, специи, капуста, морковь, сирача, майонез, бриошь',
    weight: 300, kcal: 720, protein: 36, fat: 38, carbs: 56, price: 690,
    addons: burgerAddons, mods: burgerMods,
  }),
  dish({
    id: 'burger-vegan', category: 'burgers', name: 'Веган-бургер на грибах',
    short: 'портобелло, авокадо, тахини',
    desc: 'Шляпки портобелло на углях, авокадо, тахини, маринованные овощи, цельнозерновая булочка.',
    ingredients: 'грибы портобелло, авокадо, тахини, маринованная морковь, редис, руккола, цельнозерновая булочка',
    weight: 280, kcal: 540, protein: 14, fat: 32, carbs: 52, price: 620,
    addons: burgerAddons, mods: burgerMods,
  }),

  // ───────── Гриль ─────────
  dish({
    id: 'grill-ribeye', category: 'grill', name: 'Рибай 300 г', featured: true,
    short: 'мраморная говядина, соль, перец',
    desc: 'Рибай блэк ангус на дровах, отдых под фольгой, две минуты до подачи.',
    ingredients: 'рибай блэк ангус, морская соль, чёрный перец, сливочное масло, тимьян',
    weight: 300, kcal: 780, protein: 56, fat: 58, carbs: 2, price: 2490,
    options: donenessGroup('medium-rare'),
  }),
  dish({
    id: 'grill-striploin', category: 'grill', name: 'Стриплойн 250 г',
    short: 'блэк ангус, чимичурри',
    desc: 'Стриплойн на угольной решётке, подача с чимичурри и печёным луком-шалотом.',
    ingredients: 'стриплойн блэк ангус, морская соль, чимичурри, лук-шалот, петрушка, чеснок',
    weight: 250, kcal: 640, protein: 48, fat: 46, carbs: 4, price: 1890,
    options: donenessGroup('medium-rare'),
  }),
  dish({
    id: 'grill-lamb-rack', category: 'grill', name: 'Каре ягнёнка',
    short: 'ягнёнок, розмарин, чесночное пюре',
    desc: 'Каре новозеландского ягнёнка с корочкой из дижона и трав, пюре из печёного чеснока.',
    ingredients: 'каре ягнёнка, дижонская горчица, розмарин, тимьян, чеснок, оливковое масло, сливки',
    weight: 320, kcal: 720, protein: 44, fat: 52, carbs: 8, price: 1690,
    options: donenessGroup('medium-rare'),
  }),
  dish({
    id: 'grill-seabass', category: 'grill', name: 'Сибас целиком',
    short: 'сибас на углях, лимон, оливки',
    desc: 'Сибас на дровах, фаршированный лимоном и травами, с тёплыми оливками и каперсами.',
    ingredients: 'сибас, лимон, тимьян, розмарин, оливки таджаска, каперсы, оливковое масло',
    weight: 380, kcal: 520, protein: 42, fat: 32, carbs: 4, price: 1290,
  }),

  // ───────── Десерты ─────────
  dish({
    id: 'dessert-pavlova', category: 'desserts', name: 'Павлова с чёрной смородиной',
    short: 'безе, маскарпоне, ягоды',
    desc: 'Хрустящее безе, крем из маскарпоне, чёрная смородина с лимонной цедрой.',
    ingredients: 'белок, сахар, маскарпоне, сливки, чёрная смородина, лимонная цедра',
    weight: 160, kcal: 380, protein: 6, fat: 22, carbs: 38, price: 420,
  }),
  dish({
    id: 'dessert-tarte-tatin', category: 'desserts', name: 'Тарт татен',
    short: 'печёное яблоко, карамель, мороженое',
    desc: 'Перевёрнутый тарт с карамелизированным яблоком, шарик ванильного мороженого.',
    ingredients: 'яблоко, сливочное масло, сахар, слоёное тесто, ваниль, сливки',
    weight: 180, kcal: 460, protein: 5, fat: 24, carbs: 52, price: 460,
  }),
  dish({
    id: 'dessert-fondant', category: 'desserts', name: 'Шоколадный фондан',
    short: 'тёмный шоколад 70%, жидкий центр',
    desc: 'Фондан из бельгийского шоколада с тягучей сердцевиной, к нему — соль и ваниль.',
    ingredients: 'тёмный шоколад 70%, сливочное масло, яйцо, мука, сахар, ванильное мороженое',
    weight: 140, kcal: 520, protein: 8, fat: 28, carbs: 56, price: 490,
  }),

  // ───────── Бар ─────────
  dish({
    id: 'bar-negroni', category: 'bar', name: 'Negroni',
    short: 'джин, кампари, вермут',
    desc: 'Классический рецепт, апельсиновая цедра, большой кубик льда.',
    ingredients: 'джин, кампари, вермут россо, апельсиновая цедра',
    weight: 90, price: 690,
  }),
  dish({
    id: 'bar-old-fashioned', category: 'bar', name: 'Old Fashioned',
    short: 'бурбон, биттер, цедра',
    desc: 'Бурбон, тростниковый сахар, биттер ангостура, цедра апельсина.',
    ingredients: 'бурбон, тростниковый сахар, биттер ангостура, апельсиновая цедра',
    weight: 80, price: 690,
  }),
  dish({
    id: 'bar-aperol-spritz', category: 'bar', name: 'Aperol Spritz',
    short: 'апероль, просекко, содовая',
    desc: 'Апероль, итальянское просекко, капля содовой, ломтик апельсина.',
    ingredients: 'апероль, просекко, содовая, апельсин',
    weight: 200, price: 590,
  }),
  dish({
    id: 'bar-tarragon-lemonade', category: 'bar', name: 'Авторский лимонад на тархуне',
    short: 'тархун, лайм, имбирь',
    desc: 'Свежий тархун, лайм и имбирь, газированная вода с минимальным сахаром.',
    ingredients: 'тархун, лайм, имбирь, тростниковый сахар, газированная вода',
    weight: 350, kcal: 80, protein: 0, fat: 0, carbs: 20, price: 320,
  }),
]

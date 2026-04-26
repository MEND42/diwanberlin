const DEFAULT_CATEGORIES = [
  {
    slug: 'getraenke',
    nameDe: 'Getränke',
    nameFa: 'نوشیدنی‌ها',
    nameEn: 'Drinks',
    sortOrder: 1,
    children: [
      { slug: 'hot-drinks', nameDe: 'Heiße Getränke', nameFa: 'نوشیدنی‌های گرم', nameEn: 'Hot Drinks', sortOrder: 1 },
      { slug: 'cold-drinks', nameDe: 'Kalte Getränke', nameFa: 'نوشیدنی‌های سرد', nameEn: 'Cold Drinks', sortOrder: 2 },
      { slug: 'coffees', nameDe: 'Kaffee', nameFa: 'قهوه', nameEn: 'Coffee', sortOrder: 3 },
      { slug: 'teas', nameDe: 'Tee', nameFa: 'چای', nameEn: 'Tea', sortOrder: 4 },
      { slug: 'alcoholic-drinks', nameDe: 'Alkoholische Getränke', nameFa: 'نوشیدنی‌های الکلی', nameEn: 'Alcoholic Drinks', sortOrder: 5 },
      { slug: 'soft-drinks', nameDe: 'Softdrinks', nameFa: 'نوشابه‌ها', nameEn: 'Soft Drinks', sortOrder: 6 },
      { slug: 'seasonal-juices', nameDe: 'Saisonale Säfte', nameFa: 'آبمیوه‌های فصلی', nameEn: 'Seasonal Juices', sortOrder: 7 },
    ],
  },
  {
    slug: 'snacks',
    nameDe: 'Snacks',
    nameFa: 'میان‌وعده‌ها',
    nameEn: 'Snacks',
    sortOrder: 2,
    children: [
      { slug: 'light-snacks', nameDe: 'Leichte Snacks', nameFa: 'میان‌وعده‌های سبک', nameEn: 'Light Snacks', sortOrder: 1 },
      { slug: 'afghan-snacks', nameDe: 'Afghanische Snacks', nameFa: 'میان‌وعده‌های افغانی', nameEn: 'Afghan Snacks', sortOrder: 2 },
      { slug: 'sweet-snacks', nameDe: 'Süße Snacks', nameFa: 'میان‌وعده‌های شیرین', nameEn: 'Sweet Snacks', sortOrder: 3 },
    ],
  },
];

const DEFAULT_ITEMS = [
  {
    slug: 'coffees',
    items: [
      ['Espresso', 'اسپرسو', 'Espresso', 'Kräftiger Espresso mit dichter Crema.', 'اسپرسوی قوی با کرمای لطیف.', 'Strong espresso with a rich crema.', 2.9],
      ['Americano', 'آمریکانو', 'Americano', 'Espresso verlängert mit heißem Wasser.', 'اسپرسو با آب داغ، سبک و خوش‌عطر.', 'Espresso lengthened with hot water.', 3.5],
      ['Cappuccino', 'کاپوچینو', 'Cappuccino', 'Espresso mit samtigem Milchschaum.', 'اسپرسو با کف شیر نرم.', 'Espresso with silky milk foam.', 4.2],
      ['Latte Macchiato', 'لاته ماکیاتو', 'Latte Macchiato', 'Warme Milch, Espresso und feiner Schaum.', 'شیر گرم، اسپرسو و کف لطیف.', 'Warm milk, espresso and fine foam.', 4.6],
      ['Kardamom Kaffee', 'قهوه هل‌دار', 'Cardamom Coffee', 'Hauskaffee mit Kardamom und warmem Aroma.', 'قهوه خانگی با هل و عطر گرم.', 'House coffee with cardamom and warm aroma.', 4.8],
    ],
  },
  {
    slug: 'teas',
    items: [
      ['Afghanischer Grüntee', 'چای سبز افغانی', 'Afghan Green Tea', 'Grüntee mit Kardamom, klassisch serviert.', 'چای سبز با هل به سبک افغانی.', 'Green tea with cardamom, served Afghan style.', 3.9],
      ['Schwarzer Tee mit Kardamom', 'چای سیاه با هل', 'Black Tea with Cardamom', 'Kräftiger Schwarztee mit warmer Gewürznote.', 'چای سیاه پررنگ با عطر هل.', 'Strong black tea with warm spice notes.', 3.9],
      ['Kashmiri Chai', 'چای کشمیری', 'Kashmiri Chai', 'Cremiger rosa Tee mit Milch und Gewürzen.', 'چای صورتی خامه‌ای با شیر و ادویه.', 'Creamy pink tea with milk and spices.', 4.9],
      ['Frischer Minztee', 'چای نعناع تازه', 'Fresh Mint Tea', 'Frische Minze, heiß aufgegossen.', 'نعناع تازه دم‌شده با آب داغ.', 'Fresh mint infused with hot water.', 3.7],
    ],
  },
  {
    slug: 'hot-drinks',
    items: [
      ['Heiße Schokolade', 'شکلات داغ', 'Hot Chocolate', 'Dunkle Schokolade mit Milch.', 'شکلات تلخ با شیر گرم.', 'Dark chocolate with warm milk.', 4.4],
      ['Chai Latte', 'چای لاته', 'Chai Latte', 'Gewürztee mit Milch und feinem Schaum.', 'چای ادویه‌دار با شیر و کف نرم.', 'Spiced tea with milk and foam.', 4.6],
      ['Salep', 'ثعلب', 'Salep', 'Warmer Milchdrink mit Zimt und feiner Süße.', 'نوشیدنی گرم شیری با دارچین.', 'Warm milk drink with cinnamon and gentle sweetness.', 4.8],
    ],
  },
  {
    slug: 'cold-drinks',
    items: [
      ['Iced Latte', 'آیس لاته', 'Iced Latte', 'Espresso auf Eis mit kalter Milch.', 'اسپرسو با یخ و شیر سرد.', 'Espresso over ice with cold milk.', 4.8],
      ['Iced Americano', 'آیس آمریکانو', 'Iced Americano', 'Espresso, Wasser und Eis.', 'اسپرسو، آب و یخ.', 'Espresso, water and ice.', 4.2],
      ['Hausgemachte Limonade', 'لیموناد خانگی', 'Homemade Lemonade', 'Zitrone, Minze und leichte Süße.', 'لیمو، نعناع و شیرینی ملایم.', 'Lemon, mint and light sweetness.', 4.9],
    ],
  },
  {
    slug: 'soft-drinks',
    items: [
      ['Mineralwasser', 'آب معدنی', 'Mineral Water', 'Still oder sprudelnd.', 'ساده یا گازدار.', 'Still or sparkling.', 2.8],
      ['Cola', 'کولا', 'Cola', 'Klassisch gekühlt serviert.', 'سرد سرو می‌شود.', 'Classic, served chilled.', 3.2],
      ['Fanta / Sprite', 'فانتا / اسپرایت', 'Fanta / Sprite', 'Erfrischende Softdrinks.', 'نوشابه‌های خنک.', 'Refreshing soft drinks.', 3.2],
      ['Ayran', 'آیران', 'Ayran', 'Joghurtgetränk, leicht salzig.', 'نوشیدنی ماستی کمی شور.', 'Lightly salted yoghurt drink.', 3.4],
    ],
  },
  {
    slug: 'seasonal-juices',
    items: [
      ['Frischer Orangensaft', 'آب پرتقال تازه', 'Fresh Orange Juice', 'Frisch gepresst.', 'تازه فشرده‌شده.', 'Freshly squeezed.', 5.2],
      ['Granatapfelsaft', 'آب انار', 'Pomegranate Juice', 'Fruchtig und leicht herb.', 'میوه‌ای و کمی ترش.', 'Fruity and slightly tart.', 5.8],
      ['Mango Lassi', 'منگو لسی', 'Mango Lassi', 'Mango, Joghurt und Kardamom.', 'انبه، ماست و هل.', 'Mango, yoghurt and cardamom.', 5.5],
      ['Saison-Smoothie', 'اسموتی فصل', 'Seasonal Smoothie', 'Je nach Saison mit frischem Obst.', 'با میوه‌های تازه فصل.', 'Fresh fruit depending on the season.', 5.9],
    ],
  },
  {
    slug: 'alcoholic-drinks',
    items: [
      ['Hauswein Weiß', 'شراب سفید خانه', 'House White Wine', 'Glas Hauswein, gekühlt serviert.', 'یک گیلاس شراب سفید خانه.', 'Glass of house white wine, served chilled.', 5.8],
      ['Hauswein Rot', 'شراب سرخ خانه', 'House Red Wine', 'Glas Hauswein, weich und rund.', 'یک گیلاس شراب سرخ خانه.', 'Glass of soft, rounded house red wine.', 5.8],
      ['Bier', 'آبجو', 'Beer', 'Flaschenbier, gekühlt.', 'آبجوی بطری سرد.', 'Bottled beer, served chilled.', 4.2],
      ['Aperol Spritz', 'آپِرول اسپریتز', 'Aperol Spritz', 'Aperol, Prosecco und Soda.', 'آپِرول، پروسکو و سودا.', 'Aperol, prosecco and soda.', 7.5],
    ],
  },
  {
    slug: 'light-snacks',
    items: [
      ['Croissant', 'کروسان', 'Croissant', 'Buttercroissant, frisch aufgebacken.', 'کروسان کره‌ای تازه.', 'Freshly baked butter croissant.', 2.9],
      ['Oliven & Brot', 'زیتون و نان', 'Olives & Bread', 'Marinierte Oliven mit Brot.', 'زیتون مزه‌دار با نان.', 'Marinated olives with bread.', 4.8],
      ['Hummus Teller', 'بشقاب حمص', 'Hummus Plate', 'Hummus, Öl, Gewürze und Brot.', 'حمص با روغن، ادویه و نان.', 'Hummus, oil, spices and bread.', 6.5],
      ['Käseplatte klein', 'بشقاب کوچک پنیر', 'Small Cheese Plate', 'Auswahl von Käse, Brot und Beilage.', 'چند نوع پنیر با نان و کنارغذا.', 'Selection of cheese, bread and garnish.', 7.2],
    ],
  },
  {
    slug: 'afghan-snacks',
    items: [
      ['Bolani Kartoffel', 'بولانی کچالو', 'Potato Bolani', 'Gefülltes Fladenbrot mit Kartoffel und Kräutern.', 'نان پرشده با کچالو و سبزی.', 'Flatbread filled with potato and herbs.', 6.9],
      ['Bolani Kürbis', 'بولانی کدو', 'Pumpkin Bolani', 'Gefülltes Fladenbrot mit Kürbis.', 'نان پرشده با کدو.', 'Flatbread filled with pumpkin.', 7.2],
      ['Sambosa', 'سمبوسه', 'Sambosa', 'Knusprige Teigtaschen mit würziger Füllung.', 'خمیر ترد با مواد مزه‌دار.', 'Crispy pastries with a spiced filling.', 5.9],
      ['Mantu Snack', 'منتو کوچک', 'Mantu Snack', 'Gedämpfte Teigtaschen mit Joghurt und Sauce.', 'منتوی بخارپز با ماست و سس.', 'Steamed dumplings with yoghurt and sauce.', 8.5],
      ['Afghanisches Naan mit Chutney', 'نان افغانی با چتنی', 'Afghan Naan with Chutney', 'Frisches Naan mit hausgemachtem Chutney.', 'نان تازه با چتنی خانگی.', 'Fresh naan with homemade chutney.', 4.9],
    ],
  },
  {
    slug: 'sweet-snacks',
    items: [
      ['Baklava', 'بقلوا', 'Baklava', 'Süßes Gebäck mit Nüssen.', 'شیرینی با مغزها.', 'Sweet pastry with nuts.', 4.8],
      ['Dattel-Walnuss Snack', 'خرما و چهارمغز', 'Date & Walnut Snack', 'Datteln mit Walnüssen, klein serviert.', 'خرما با چهارمغز.', 'Dates with walnuts, served small.', 3.9],
      ['Hauskuchen', 'کیک خانگی', 'House Cake', 'Tageskuchen aus der Vitrine.', 'کیک روز از ویترین.', 'Cake of the day from the counter.', 4.6],
    ],
  },
];

async function upsertCategory(prisma, category, parentId = null) {
  return prisma.menuCategory.upsert({
    where: { slug: category.slug },
    update: {
      nameDe: category.nameDe,
      nameFa: category.nameFa,
      nameEn: category.nameEn,
      sortOrder: category.sortOrder,
      isActive: true,
      parentId,
    },
    create: {
      nameDe: category.nameDe,
      nameFa: category.nameFa,
      nameEn: category.nameEn,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isActive: true,
      parentId,
    },
  });
}

async function seedDefaultMenu(prisma) {
  const categoryBySlug = {};

  for (const parentDef of DEFAULT_CATEGORIES) {
    const parent = await upsertCategory(prisma, parentDef, null);
    categoryBySlug[parentDef.slug] = parent;
    for (const childDef of parentDef.children) {
      categoryBySlug[childDef.slug] = await upsertCategory(prisma, childDef, parent.id);
    }
  }

  let createdItems = 0;
  let updatedItems = 0;

  for (const group of DEFAULT_ITEMS) {
    const category = categoryBySlug[group.slug]
      ?? await prisma.menuCategory.findUnique({ where: { slug: group.slug } });
    if (!category) continue;

    for (const [index, item] of group.items.entries()) {
      const [nameDe, nameFa, nameEn, descriptionDe, descriptionFa, descriptionEn, price] = item;
      const existing = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, nameDe },
      });

      const data = {
        categoryId: category.id,
        nameDe,
        nameFa,
        nameEn,
        descriptionDe,
        descriptionFa,
        descriptionEn,
        price,
        sortOrder: index + 1,
        isAvailable: true,
      };

      if (existing) {
        await prisma.menuItem.update({ where: { id: existing.id }, data });
        updatedItems += 1;
      } else {
        await prisma.menuItem.create({ data });
        createdItems += 1;
      }
    }
  }

  return {
    categoriesCount: Object.keys(categoryBySlug).length,
    createdItems,
    updatedItems,
  };
}

async function ensureDefaultMenu(prisma) {
  const [categoryCount, itemCount] = await Promise.all([
    prisma.menuCategory.count(),
    prisma.menuItem.count(),
  ]);

  if (categoryCount > 0 && itemCount > 0) {
    return { seeded: false, categoriesCount: categoryCount, createdItems: 0, updatedItems: 0 };
  }

  const result = await seedDefaultMenu(prisma);
  return { seeded: true, ...result };
}

module.exports = {
  DEFAULT_CATEGORIES,
  DEFAULT_ITEMS,
  seedDefaultMenu,
  ensureDefaultMenu,
};

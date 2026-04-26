const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient({});

async function main() {
  // 1. Create Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: { email: 'hello@diwanberlin.com' },
    create: {
      username: 'admin',
      email: 'hello@diwanberlin.com',
      passwordHash,
    },
  });

  // 2. Create 30 Tables
  for (let i = 1; i <= 30; i++) {
    await prisma.table.upsert({
      where: { number: i },
      update: {},
      create: {
        number: i,
        label: `Tisch ${i}`,
        seats: 4,
      },
    });
  }

  // 3. Create Categories
  const getraenke = await prisma.menuCategory.upsert({
    where: { slug: 'getraenke' },
    update: {},
    create: { nameDe: 'Getränke', nameFa: 'نوشیدنی‌ها', slug: 'getraenke', sortOrder: 1 }
  });
  const hotDrinks = await prisma.menuCategory.upsert({
    where: { slug: 'hot-drinks' },
    update: { parentId: getraenke.id },
    create: { nameDe: 'Heiße Getränke', nameFa: 'نوشیدنی‌های گرم', slug: 'hot-drinks', sortOrder: 1, parentId: getraenke.id }
  });
  const coldDrinks = await prisma.menuCategory.upsert({
    where: { slug: 'cold-drinks' },
    update: { parentId: getraenke.id },
    create: { nameDe: 'Kalte Getränke', nameFa: 'نوشیدنی‌های سرد', slug: 'cold-drinks', sortOrder: 2, parentId: getraenke.id }
  });
  const seasonal = await prisma.menuCategory.upsert({
    where: { slug: 'seasonal' },
    update: { parentId: getraenke.id },
    create: { nameDe: 'Saisonale Getränke', nameFa: 'نوشیدنی‌های فصلی', slug: 'seasonal', sortOrder: 3, parentId: getraenke.id }
  });
  const softDrinks = await prisma.menuCategory.upsert({
    where: { slug: 'soft-drinks' },
    update: { parentId: getraenke.id },
    create: { nameDe: 'Alkoholfreie Getränke', nameFa: 'نوشیدنی‌های غیرالکلی', slug: 'soft-drinks', sortOrder: 4, parentId: getraenke.id }
  });
  const spirits = await prisma.menuCategory.upsert({
    where: { slug: 'spirits' },
    update: { parentId: getraenke.id },
    create: { nameDe: 'Spirituosen & Cocktails', nameFa: 'مشروبات', slug: 'spirits', sortOrder: 5, parentId: getraenke.id }
  });

  const suesses = await prisma.menuCategory.upsert({
    where: { slug: 'suesses' },
    update: {},
    create: { nameDe: 'Süßes', nameFa: 'شیرینی‌جات', slug: 'suesses', sortOrder: 2 }
  });
  const cakes = await prisma.menuCategory.upsert({
    where: { slug: 'cakes' },
    update: { parentId: suesses.id },
    create: { nameDe: 'Kuchen & Torten', nameFa: 'کیک', slug: 'cakes', sortOrder: 1, parentId: suesses.id }
  });
  const biscuits = await prisma.menuCategory.upsert({
    where: { slug: 'biscuits' },
    update: { parentId: suesses.id },
    create: { nameDe: 'Kekse & Gebäck', nameFa: 'بیسکویت', slug: 'biscuits', sortOrder: 2, parentId: suesses.id }
  });

  const herzhaft = await prisma.menuCategory.upsert({
    where: { slug: 'herzhaft' },
    update: {},
    create: { nameDe: 'Herzhafte Speisen', nameFa: 'غذاهای شور', slug: 'herzhaft', sortOrder: 3 }
  });
  const snacks = await prisma.menuCategory.upsert({
    where: { slug: 'snacks' },
    update: { parentId: herzhaft.id },
    create: { nameDe: 'Snacks', nameFa: 'میان‌وعده', slug: 'snacks', sortOrder: 1, parentId: herzhaft.id }
  });
  const fingerFood = await prisma.menuCategory.upsert({
    where: { slug: 'finger-food' },
    update: { parentId: herzhaft.id },
    create: { nameDe: 'Finger Food', nameFa: 'فینگرفود', slug: 'finger-food', sortOrder: 2, parentId: herzhaft.id }
  });
  const afghanSpecials = await prisma.menuCategory.upsert({
    where: { slug: 'afghan-specials' },
    update: { parentId: herzhaft.id },
    create: { nameDe: 'Afghanische Spezialitäten', nameFa: 'غذاهای افغانی', slug: 'afghan-specials', sortOrder: 3, parentId: herzhaft.id }
  });

  // 4. Create Items
  // We'll just add one item per category for seeding, the rest can be added from the dashboard
  const items = [
    { categoryId: hotDrinks.id, nameDe: 'Espresso', nameFa: 'اسپرسو', descriptionDe: 'Doppelter Espresso', price: 6.80, sortOrder: 1, isSpecial: false },
    { categoryId: hotDrinks.id, nameDe: 'Grüntee mit Kardamom', nameFa: 'چای سبز با هل', descriptionDe: 'Feiner Grüntee mit Kardamom', price: 5.00, sortOrder: 2, isSpecial: true },
    { categoryId: afghanSpecials.id, nameDe: 'Bolani', nameFa: 'بولانی', descriptionDe: 'Fladenbrot mit Kartoffeln', price: 7.50, sortOrder: 1, isSpecial: true },
    { categoryId: biscuits.id, nameDe: 'Baklava', nameFa: 'بقلوا', descriptionDe: 'Hausgemacht', price: 7.50, sortOrder: 1, isSpecial: false },
  ];

  for (const item of items) {
    // using findFirst because there's no unique constraint on name, but it's okay for seed
    const exists = await prisma.menuItem.findFirst({ where: { nameDe: item.nameDe } });
    if (!exists) {
      await prisma.menuItem.create({ data: item });
    }
  }

  const eventListings = [
    {
      titleDe: 'Persischer Poesieabend',
      titleFa: 'شب شعر دری',
      description: 'Gedichte auf Persisch und Deutsch in warmer Cafe-Atmosphäre',
      eventDate: new Date('2026-05-24T19:00:00.000Z'),
      eventTime: '19:00 Uhr',
      sortOrder: 1
    },
    {
      titleDe: 'Musikabend',
      titleFa: 'شب موسیقی افغانی',
      description: 'Live-Musik und kulturelle Begegnung bei Tee und Kaffee',
      eventDate: new Date('2026-05-31T20:00:00.000Z'),
      eventTime: '20:00 Uhr',
      sortOrder: 2
    }
  ];

  for (const event of eventListings) {
    const exists = await prisma.eventListing.findFirst({
      where: { titleDe: event.titleDe, eventDate: event.eventDate }
    });
    if (!exists) await prisma.eventListing.create({ data: event });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

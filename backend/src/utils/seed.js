const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient({});

async function main() {
  // 1. Create Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
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
  const coffeeCat = await prisma.menuCategory.upsert({
    where: { slug: 'coffee' },
    update: {},
    create: { nameDe: 'Kaffee', nameFa: 'قهوه', slug: 'coffee', sortOrder: 1 }
  });
  const teaCat = await prisma.menuCategory.upsert({
    where: { slug: 'tea' },
    update: {},
    create: { nameDe: 'Tee', nameFa: 'چای', slug: 'tea', sortOrder: 2 }
  });
  const foodCat = await prisma.menuCategory.upsert({
    where: { slug: 'food' },
    update: {},
    create: { nameDe: 'Afghanische Küche', nameFa: 'غذا', slug: 'food', sortOrder: 3 }
  });
  const sweetsCat = await prisma.menuCategory.upsert({
    where: { slug: 'sweets' },
    update: {},
    create: { nameDe: 'Kuchen & Süßes', nameFa: 'شیرینی', slug: 'sweets', sortOrder: 4 }
  });

  // 4. Create Items
  // We'll just add one item per category for seeding, the rest can be added from the dashboard
  const items = [
    { categoryId: coffeeCat.id, nameDe: 'Espresso', nameFa: 'اسپرسو', descriptionDe: 'Doppelter Espresso', price: 6.80, sortOrder: 1 },
    { categoryId: teaCat.id, nameDe: 'Afghanischer Grüntee', nameFa: 'چای سبز افغانی', descriptionDe: 'Feiner Grüntee mit Kardamom', price: 5.00, sortOrder: 1 },
    { categoryId: foodCat.id, nameDe: 'Bolani', nameFa: 'بولانی', descriptionDe: 'Fladenbrot mit Kartoffeln', price: 7.50, sortOrder: 1 },
    { categoryId: sweetsCat.id, nameDe: 'Baklava', nameFa: 'بقلوا', descriptionDe: 'Hausgemacht', price: 7.50, sortOrder: 1 },
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
      titleDe: 'Dari Poesieabend',
      titleFa: 'شب شعر دری',
      description: 'Gedichte auf Dari und Deutsch in warmer Cafe-Atmosphäre',
      eventDate: new Date('2026-05-24T19:00:00.000Z'),
      eventTime: '19:00 Uhr',
      sortOrder: 1
    },
    {
      titleDe: 'Afghanischer Musikabend',
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

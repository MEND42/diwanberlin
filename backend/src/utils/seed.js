const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { seedDefaultMenu } = require('./defaultMenu');
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

  await seedDefaultMenu(prisma);

  const eventListings = [
    {
      titleDe: 'Persischer Poesieabend',
      titleFa: 'شب شعر فارسی',
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

  // 5. Create Site Settings for capacities
  const settings = [
    { key: 'maxCapacity', value: '60', type: 'NUMBER', category: 'capacities' },
    { key: 'eventsPerMonth', value: '15', type: 'NUMBER', category: 'capacities' },
    { key: 'openingTime', value: '07:00', type: 'STRING', category: 'general' },
    { key: 'closingTime', value: '21:00', type: 'STRING', category: 'general' },
  ];

  for (const s of settings) {
    await prisma.siteSettings.upsert({
      where: { key: s.key },
      update: {},
      create: s
    });
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

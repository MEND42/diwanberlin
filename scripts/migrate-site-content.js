const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrate() {
  console.log('=== Site Content Migration ===\n');

  // Find existing about_de and about_fa blocks
  const aboutDe = await prisma.siteContentBlock.findUnique({
    where: { key: 'about_de' }
  });
  const aboutFa = await prisma.siteContentBlock.findUnique({
    where: { key: 'about_fa' }
  });

  console.log('Found blocks:');
  console.log('  about_de:', aboutDe ? `ID: ${aboutDe.id}, valueDe: "${aboutDe.valueDe?.slice(0, 50)}..."` : 'NOT FOUND');
  console.log('  about_fa:', aboutFa ? `ID: ${aboutFa.id}, valueFa: "${aboutFa.valueFa?.slice(0, 50)}..."` : 'NOT FOUND');

  // Check if aboutIntro already exists
  const aboutIntro = await prisma.siteContentBlock.findUnique({
    where: { key: 'aboutIntro' }
  });

  if (aboutIntro) {
    console.log('\n  aboutIntro already exists, skipping migration.');
    await prisma.$disconnect();
    return;
  }

  // Create new aboutIntro block with combined values
  if (aboutDe || aboutFa) {
    const newBlock = await prisma.siteContentBlock.create({
      data: {
        key: 'aboutIntro',
        label: 'Über uns Text',
        type: 'TEXTAREA',
        valueDe: aboutDe?.valueDe || null,
        valueFa: aboutFa?.valueFa || null,
        isPublished: true,
      }
    });
    console.log('\nCreated new aboutIntro block:');
    console.log('  ID:', newBlock.id);
    console.log('  valueDe:', newBlock.valueDe?.slice(0, 50) + '...');
    console.log('  valueFa:', newBlock.valueFa?.slice(0, 50) + '...');
    
    // Optionally delete old blocks
    if (aboutDe) {
      await prisma.siteContentBlock.delete({ where: { id: aboutDe.id } });
      console.log('\nDeleted old about_de block');
    }
    if (aboutFa) {
      await prisma.siteContentBlock.delete({ where: { id: aboutFa.id } });
      console.log('Deleted old about_fa block');
    }
    
    console.log('\n✓ Migration complete!');
  } else {
    console.log('\nNo existing about_de or about_fa blocks found. Nothing to migrate.');
  }

  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CULTURAL_CONTENT = [
  {
    key: 'cultural_intro',
    label: 'Kulturelle Einleitung',
    type: 'RICH_TEXT',
    valueFa: 'دیوان یک فضای زنده فرهنگی است که در آن هنر، ادبیات و موسیقی با یکدیگر ملاقات می‌کنند. ما باور داریم که فرهنگ پلی است که انسان‌ها را به هم متصل می‌کند.',
    valueEn: 'Diwan is a living cultural space where art, literature, and music come together. We believe culture is the bridge that connects people.',
    valueDe: null,
  },
  {
    key: 'pillar_poetry',
    label: 'ستون شعر و ادبیات',
    type: 'RICH_TEXT',
    valueFa: 'شب‌های شعرخوانی ما فرصتی است برای شنیدن صدای شاعران ایرانی و بین‌المللی. از غزل классик تا شعر مدرن، هر هفته فضایی نو برای کشف ادبیات فراهم می‌کنیم.',
    valueEn: 'Our poetry nights feature Iranian and international poets. From classical ghazals to modern verses, we create a space to discover literature every week.',
    valueDe: null,
  },
  {
    key: 'pillar_music',
    label: 'ستون موسیقی',
    type: 'RICH_TEXT',
    valueFa: 'از موسیقی سنتی ایرانی تا جاز و موسیقی جهانی، صحنه دیوان میزبان اجراهای زنده متنوع است. هر شب یک سفر موسیقیکی جدید.',
    valueEn: 'From traditional Iranian music to jazz and world music, Diwan\'s stage hosts diverse live performances. Every night is a new musical journey.',
    valueDe: null,
  },
  {
    key: 'pillar_literature',
    label: 'ستون کتاب و مطالعه',
    type: 'RICH_TEXT',
    valueFa: 'بخش کتاب ما شامل مجموعه‌ای از کتاب‌های فارسی، آلمانی و انگلیسی است. جلسات مطالعه و معرفی کتاب به صورت منظم برگزار می‌شود.',
    valueEn: 'Our book section features Persian, German, and English collections. Regular book clubs and readings are held throughout the month.',
    valueDe: null,
  },
  {
    key: 'private_celebrations',
    label: 'جشن‌های خصوصی',
    type: 'RICH_TEXT',
    valueFa: 'فضای دیوان برای جشن‌های خصوصی شما: از جشن تولد تا مراسم نامزدی و عروسی. ما به شما کمک می‌کنیم تا لحظات خاص خود را در فضایی فرهنگی و زیبا جشن بگیرید.',
    valueEn: 'Celebrate your special moments at Diwan: from birthdays to engagements and weddings. We help you create memorable celebrations in a cultural setting.',
    valueDe: null,
  },
  {
    key: 'multipurpose_space',
    label: 'فضای چندمنظوره',
    type: 'RICH_TEXT',
    valueFa: 'سالن چندمنظوره دیوان با ظرفیت 60 نفر آماده میزبانی کارگاه‌ها، سمینارها، نمایشگاه‌ها و رویدادهای فرهنگی است. تجهیزات صوتی و تصویری پیشرفته در دسترس است.',
    valueEn: 'Diwan\'s multipurpose hall accommodates 60 guests for workshops, seminars, exhibitions, and cultural events. Advanced audio-visual equipment is available.',
    valueDe: null,
  },
  {
    key: 'capacity_blurb',
    label: 'ظرفیت و امکانات',
    type: 'RICH_TEXT',
    valueFa: 'فضای اصلی: 60 نفر | فضای بیرون: 40 نفر | اینترنت رایگان | پارکینگ | دسترسی آسان با حمل‌ونقل عمومی',
    valueEn: 'Indoor: 60 guests | Outdoor: 40 guests | Free WiFi | Parking | Easy public transport access',
    valueDe: null,
  },
  {
    key: 'closing_invitation',
    label: 'دعوت پایانی',
    type: 'RICH_TEXT',
    valueFa: 'ما در دیوان منتظر شما هستیم. بیایید با هم داستان بسازیم. هر روز از ساعت ۸ صبح تا ۱۰ شب.',
    valueEn: 'We await you at Diwan. Let\'s create stories together. Open daily 8 AM to 10 PM.',
    valueDe: null,
  },
];

async function seed() {
  console.log('=== Seeding Cultural Content ===\n');

  for (const content of CULTURAL_CONTENT) {
    try {
      const block = await prisma.siteContentBlock.upsert({
        where: { key: content.key },
        update: {
          label: content.label,
          type: content.type,
          valueFa: content.valueFa,
          valueEn: content.valueEn,
          valueDe: content.valueDe,
        },
        create: {
          key: content.key,
          label: content.label,
          type: content.type,
          valueFa: content.valueFa,
          valueEn: content.valueEn,
          valueDe: content.valueDe,
          isPublished: true,
        },
      });
      console.log(`✓ ${content.key}`);
    } catch (error) {
      console.error(`✗ ${content.key}:`, error.message);
    }
  }

  console.log('\n=== Seeding Complete ===');
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
});
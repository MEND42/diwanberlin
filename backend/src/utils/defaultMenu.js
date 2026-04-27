const { randomUUID } = require('crypto');

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
  {
    slug: 'fruehstueck-menu',
    nameDe: 'Frühstück',
    nameFa: 'صبحانه',
    nameEn: 'Breakfast',
    sortOrder: 3,
    children: [
      { slug: 'fruehstueck', nameDe: 'Frühstück', nameFa: 'صبحانه', nameEn: 'Breakfast', sortOrder: 1 },
      { slug: 'eierlei', nameDe: 'Eierlei', nameFa: 'غذاهای تخم‌مرغی', nameEn: 'Egg Dishes', sortOrder: 2 },
      { slug: 'extras', nameDe: 'Extras', nameFa: 'افزودنی‌ها', nameEn: 'Extras', sortOrder: 3 },
    ],
  },
  {
    slug: 'desserts',
    nameDe: 'Desserts',
    nameFa: 'دسرها',
    nameEn: 'Desserts',
    sortOrder: 4,
    children: [
      { slug: 'eisbecher', nameDe: 'Eisbecher', nameFa: 'بستنی جامی', nameEn: 'Ice Cream Sundaes', sortOrder: 1 },
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

const SIZE_VARIANTS_BY_ITEM = {
  Espresso: [
    ['Einfach', 'تک', 'Single', 2.9],
    ['Doppelt', 'دوبل', 'Double', 3.9],
  ],
  Americano: [
    ['Klein', 'کوچک', 'Small', 3.5],
    ['Mittel', 'متوسط', 'Medium', 4.2],
    ['Groß', 'بزرگ', 'Large', 4.8],
  ],
  Cappuccino: [
    ['Klein', 'کوچک', 'Small', 4.2],
    ['Mittel', 'متوسط', 'Medium', 4.9],
    ['Groß', 'بزرگ', 'Large', 5.5],
  ],
  'Latte Macchiato': [
    ['Klein', 'کوچک', 'Small', 4.6],
    ['Mittel', 'متوسط', 'Medium', 5.3],
    ['Groß', 'بزرگ', 'Large', 5.9],
  ],
  'Kardamom Kaffee': [
    ['Klein', 'کوچک', 'Small', 4.8],
    ['Mittel', 'متوسط', 'Medium', 5.5],
    ['Groß', 'بزرگ', 'Large', 6.1],
  ],
  'Afghanischer Grüntee': [
    ['Tasse', 'فنجان', 'Cup', 3.9],
    ['Kanne', 'قوری', 'Pot', 6.5],
  ],
  'Schwarzer Tee mit Kardamom': [
    ['Tasse', 'فنجان', 'Cup', 3.9],
    ['Kanne', 'قوری', 'Pot', 6.5],
  ],
  'Kashmiri Chai': [
    ['Klein', 'کوچک', 'Small', 4.9],
    ['Groß', 'بزرگ', 'Large', 6.2],
  ],
  'Frischer Minztee': [
    ['Tasse', 'فنجان', 'Cup', 3.7],
    ['Kanne', 'قوری', 'Pot', 6.2],
  ],
  'Heiße Schokolade': [
    ['Klein', 'کوچک', 'Small', 4.4],
    ['Mittel', 'متوسط', 'Medium', 5.1],
    ['Groß', 'بزرگ', 'Large', 5.8],
  ],
  'Chai Latte': [
    ['Klein', 'کوچک', 'Small', 4.6],
    ['Mittel', 'متوسط', 'Medium', 5.3],
    ['Groß', 'بزرگ', 'Large', 5.9],
  ],
  Salep: [
    ['Klein', 'کوچک', 'Small', 4.8],
    ['Groß', 'بزرگ', 'Large', 6.2],
  ],
  'Iced Latte': [
    ['Klein', 'کوچک', 'Small', 4.8],
    ['Mittel', 'متوسط', 'Medium', 5.5],
    ['Groß', 'بزرگ', 'Large', 6.1],
  ],
  'Iced Americano': [
    ['Klein', 'کوچک', 'Small', 4.2],
    ['Mittel', 'متوسط', 'Medium', 4.8],
    ['Groß', 'بزرگ', 'Large', 5.4],
  ],
  'Hausgemachte Limonade': [
    ['Klein', 'کوچک', 'Small', 4.9],
    ['Groß', 'بزرگ', 'Large', 6.2],
  ],
  'Frischer Orangensaft': [
    ['0,2 l', '۰٫۲ لیتر', '0.2 l', 5.2],
    ['0,4 l', '۰٫۴ لیتر', '0.4 l', 7.8],
  ],
  Granatapfelsaft: [
    ['0,2 l', '۰٫۲ لیتر', '0.2 l', 5.8],
    ['0,4 l', '۰٫۴ لیتر', '0.4 l', 8.4],
  ],
  'Mango Lassi': [
    ['Klein', 'کوچک', 'Small', 5.5],
    ['Groß', 'بزرگ', 'Large', 7.2],
  ],
  'Saison-Smoothie': [
    ['Klein', 'کوچک', 'Small', 5.9],
    ['Groß', 'بزرگ', 'Large', 7.6],
  ],
  Mineralwasser: [
    ['0,25 l', '۰٫۲۵ لیتر', '0.25 l', 2.8],
    ['0,75 l', '۰٫۷۵ لیتر', '0.75 l', 6.5],
  ],
  Cola: [
    ['0,2 l', '۰٫۲ لیتر', '0.2 l', 3.2],
    ['0,4 l', '۰٫۴ لیتر', '0.4 l', 4.5],
  ],
  'Fanta / Sprite': [
    ['0,2 l', '۰٫۲ لیتر', '0.2 l', 3.2],
    ['0,4 l', '۰٫۴ لیتر', '0.4 l', 4.5],
  ],
};

const LEGACY_MENU_ITEMS = [
  {
    slug: 'fruehstueck',
    items: [
      ['120. Pour moi', '۱۲۰. پور موا', '120. Pour moi', 'Zwei Croissants, Konfitüre, Butter und frisches Obst.', 'دو عدد کروسان، مربا، کره و میوه تازه.', 'Two croissants, jam, butter, and fresh fruit.', 5.5],
      ['121. Mon amour', '۱۲۱. مون آمور', '121. Mon amour', 'Zwei warme halbe Baguettes, Toast, Camembert, Konfitüre, Honig, Butter und frisches Obst.', 'دو عدد نصف باگت گرم، تست، پنیر کامامبر، مربا، عسل، کره و میوه تازه.', 'Two warm half baguettes, toast, Camembert, jam, honey, butter, and fresh fruit.', 6.5],
      ['122. Bavaria', '۱۲۲. باواریا', '122. Bavaria', 'Zwei bayerische Weißwürste, warm serviert mit süßem Senf und frischem Laugengebäck.', 'دو عدد سوسیس سفید بایرنی گرم سرو شده با خردل شیرین و نان چوب‌شور تازه.', 'Two Bavarian white sausages served warm with sweet mustard and fresh pretzel bread.', 6.5],
      ['123. Fromage', '۱۲۳. فرماژ', '123. Fromage', 'Gorgonzola, Mozzarella, Feta, Gouda, Camembert, gekochtes Ei, Oliven, Quark, Konfitüre, Honig, Nutella, Butter und frisches Obst.', 'گورگونزولا، موزارلا، فتا، گودا، کامامبر، تخم‌مرغ آب‌پز، زیتون، پنیر کوارک، مربا، عسل، نوتلا، کره و میوه تازه.', 'Gorgonzola, Mozzarella, Feta, Gouda, Camembert, boiled egg, olives, quark, jam, honey, Nutella, butter, and fresh fruit.', 10.5],
      ['124. Italia', '۱۲۴. ایتالیا', '124. Italia', 'Salami, Parmaschinken, Gorgonzola, Mozzarella, gekochtes Ei, Oliven, Konfitüre, Honig, Butter, frisches Obst und Brotkorb.', 'سالامی، ژامبون پارما، گورگونزولا، موزارلا، تخم‌مرغ آب‌پز، زیتون، مربا، عسل، کره، میوه تازه و سبد نان.', 'Salami, Parma ham, Gorgonzola, Mozzarella, boiled egg, olives, jam, honey, butter, fresh fruit, and bread basket.', 11.9],
      ['125. Luca', '۱۲۵. لوکا', '125. Luca', 'Bauernschinken, erlesene Käsesorten, gekochtes Ei, Quark, Früchtejoghurt, Konfitüre, Honig, Nutella, Butter, frisches Obst und Brotkorb. Dazu Tee, Kaffee oder 0,2 l Orangensaft.', 'ژامبون روستایی، پنیرهای منتخب، تخم‌مرغ آب‌پز، پنیر کوارک، ماست میوه‌ای، مربا، عسل، نوتلا، کره، میوه تازه و سبد نان. همراه با چای، قهوه یا ۰٫۲ لیتر آب پرتقال.', 'Farmer ham, selected cheeses, boiled egg, quark, fruit yoghurt, jam, honey, Nutella, butter, fresh fruit, and bread basket. Includes tea, coffee, or 0.2 l orange juice.', 12.5],
      ['Frühstück I', 'صبحانه ۱', 'Breakfast I', '2 Brötchen, Butter, Ei, Konfitüre und Salami. Dazu Kaffee oder Tee.', '۲ عدد نان رول، کره، تخم‌مرغ، مربا و سالامی. همراه با قهوه یا چای.', '2 bread rolls, butter, egg, jam, salami. Includes coffee or tea.', 8.5],
      ['Frühstück II', 'صبحانه ۲', 'Breakfast II', '2 Brötchen, Butter, Konfitüre, Rührei mit Schinken und Käse. Dazu Kaffee oder Tee.', '۲ عدد نان رول، کره، مربا، تخم‌مرغ هم‌زده با ژامبون و پنیر. همراه با قهوه یا چای.', '2 bread rolls, butter, jam, scrambled eggs with ham and cheese. Includes coffee or tea.', 8.5],
      ['Happy Frühstück', 'صبحانه هپی', 'Happy Breakfast', 'Croissant, Butter, Ei, Konfitüre und Honig. Dazu Kaffee oder Tee.', 'کروسان، کره، تخم‌مرغ، مربا و عسل. همراه با قهوه یا چای.', 'Croissant, butter, egg, jam, and honey. Includes coffee or tea.', 8.5],
      ['Käse Frühstück', 'صبحانه پنیر', 'Cheese Breakfast', '2 Brötchen, Butter, Ei, Konfitüre, Mozzarella, Frischkäse, Schnittkäse und Camembert. Dazu Kaffee oder Tee.', '۲ عدد نان رول، کره، تخم‌مرغ، مربا، موزارلا، پنیر خامه‌ای، پنیر ورقه‌ای و کامامبر. همراه با قهوه یا چای.', '2 bread rolls, butter, egg, jam, mozzarella, cream cheese, sliced cheese, and Camembert. Includes coffee or tea.', 8.5],
      ['Croissant Frühstück', 'صبحانه کروسان', 'Croissant Breakfast', '2 Croissants, Butter, Ei, Konfitüre, Frischkäse und Schnittkäse. Dazu Kaffee oder Tee.', '۲ عدد کروسان، کره، تخم‌مرغ، مربا، پنیر خامه‌ای و پنیر ورقه‌ای. همراه با قهوه یا چای.', '2 croissants, butter, egg, jam, cream cheese, and sliced cheese. Includes coffee or tea.', 9.5],
      ['Großes Frühstück', 'صبحانه بزرگ', 'Large Breakfast', '2 Brötchen, Croissant, Butter, Ei, Konfitüre, Schnittkäse, Camembert, Schinken und Salami. Dazu Kaffee oder Tee.', '۲ عدد نان رول، کروسان، کره، تخم‌مرغ، مربا، پنیر ورقه‌ای، کامامبر، ژامبون و سالامی. همراه با قهوه یا چای.', '2 bread rolls, croissant, butter, egg, jam, sliced cheese, Camembert, ham, and salami. Includes coffee or tea.', 12.95],
      ['Venera Frühstück', 'صبحانه ونرا', 'Venera Breakfast', '2 Brötchen, Butter- oder Schokocroissant, Butter, Ei, Marmelade, Honig, Rührei mit Schinken und Tomate, Käse und Pute. Dazu Kaffee oder Tee.', '۲ عدد نان رول، کروسان کره‌ای یا شکلاتی، کره، تخم‌مرغ، مربا، عسل، تخم‌مرغ هم‌زده با ژامبون و گوجه‌فرنگی، پنیر و گوشت بوقلمون. همراه با قهوه یا چای.', '2 bread rolls, butter or chocolate croissant, butter, egg, jam, honey, scrambled eggs with ham and tomato, cheese and turkey. Includes coffee or tea.', 14.95],
      ['Hausfrühstück I', 'صبحانه خانه ۱', 'House Breakfast I', 'Omelette, Salami, Schinken, Butter, Honig oder Marmelade und 2 Brötchen. Dazu Kaffee oder Tee.', 'املت، سالامی، ژامبون، کره، عسل یا مربا و ۲ عدد نان رول. همراه با قهوه یا چای.', 'Omelette, salami, ham, butter, honey or jam, and 2 bread rolls. Includes coffee or tea.', 11.95],
      ['Hausfrühstück II', 'صبحانه خانه ۲', 'House Breakfast II', 'Rührei, Salami, Käse, Butter, Honig oder Marmelade und 2 Brötchen. Dazu Kaffee oder Tee.', 'تخم‌مرغ هم‌زده، سالامی، پنیر، کره، عسل یا مربا و ۲ عدد نان رول. همراه با قهوه یا چای.', 'Scrambled eggs, salami, cheese, butter, honey or jam, and 2 bread rolls. Includes coffee or tea.', 11.95],
      ['Frühstück IV', 'صبحانه ۴', 'Breakfast IV', 'Rührei, Käse, Salami, Butter, Honig oder Marmelade und 2 Brötchen. Dazu Kaffee oder Tee.', 'تخم‌مرغ هم‌زده، پنیر، سالامی، کره، عسل یا مربا و ۲ عدد نان رول. همراه با قهوه یا چای.', 'Scrambled eggs, cheese, salami, butter, honey or jam, and 2 bread rolls. Includes coffee or tea.', 13.95],
      ['Hausfrühstück III', 'صبحانه خانه ۳', 'House Breakfast III', 'Omelette, Lachs, Käse, Butter, Honig oder Marmelade und 2 Brötchen. Dazu Kaffee oder Tee.', 'املت، ماهی سالمون، پنیر، کره، عسل یا مربا و ۲ عدد نان رول. همراه با قهوه یا چای.', 'Omelette, salmon, cheese, butter, honey or jam, and 2 bread rolls. Includes coffee or tea.', 13.95],
      ['Bauernfrühstück', 'صبحانه روستایی', "Farmer's Breakfast", 'Bauernfrühstück mit Brötchen. Dazu Kaffee oder Tee.', 'صبحانه روستایی با نان رول. همراه با قهوه یا چای.', "Farmer's breakfast with a bread roll. Includes coffee or tea.", 13.95],
      ['Bratkartoffeln mit Spiegelei', 'سیب‌زمینی با نیمرو', 'Fried Potatoes with Fried Egg', 'Bratkartoffeln mit Spiegelei und Schrippe. Dazu Kaffee oder Tee.', 'سیب‌زمینی سرخ‌کرده با نیمرو و نان رول. همراه با قهوه یا چای.', 'Fried potatoes with fried egg and bread roll. Includes coffee or tea.', 9.5],
      ['Bratkartoffeln mit Schnitzel', 'سیب‌زمینی با شنیتسل', 'Fried Potatoes with Schnitzel', 'Bratkartoffeln mit Schnitzel, Spiegelei und Schrippe. Dazu Kaffee oder Tee.', 'سیب‌زمینی سرخ‌کرده با شنیتسل، نیمرو و نان رول. همراه با قهوه یا چای.', 'Fried potatoes with schnitzel, fried egg, and bread roll. Includes coffee or tea.', 9.5],
      ['Bratkartoffeln mit Bockwurst', 'سیب‌زمینی با سوسیس', 'Fried Potatoes with Sausage', 'Bratkartoffeln mit Bockwurst und Schrippe. Dazu Kaffee oder Tee.', 'سیب‌زمینی سرخ‌کرده با سوسیس بوک‌وورست و نان رول. همراه با قهوه یا چای.', 'Fried potatoes with Bockwurst and bread roll. Includes coffee or tea.', 9.5],
      ['Menemen', 'منمن', 'Menemen', '2 Brötchen, Butter, Marmelade und Ei mit Paprika und Tomate. Dazu Kaffee oder Tee. Extras gegen Aufpreis.', '۲ عدد نان رول، کره، مربا و تخم‌مرغ با پاپریکا و گوجه‌فرنگی. همراه با قهوه یا چای. اقلام اضافی با هزینه جداگانه.', '2 bread rolls, butter, jam, and egg with paprika and tomato. Includes coffee or tea. Extras available at extra charge.', 13.95],
      ['Spiegeleier, Omelette oder Rührei', 'نیمرو، املت یا تخم‌مرغ هم‌زده', 'Fried Eggs, Omelette or Scrambled Eggs', 'Mit Schrippe. Extras gegen Aufpreis.', 'همراه با نان رول. اقلام اضافی با هزینه جداگانه.', 'With a bread roll. Extras available at extra charge.', 6.5],
    ],
  },
  {
    slug: 'eierlei',
    items: [
      ['105. Rührei Natur', '۱۰۵. تخم‌مرغ هم‌زده ساده', '105. Natural Scrambled Eggs', 'Rührei Natur.', 'تخم‌مرغ هم‌زده ساده.', 'Natural scrambled eggs.', 5.5],
      ['106. Rührei mit frischen Kräutern', '۱۰۶. تخم‌مرغ با سبزی تازه', '106. Scrambled Eggs with Fresh Herbs', 'Rührei mit frischen Kräutern.', 'تخم‌مرغ هم‌زده با سبزیجات تازه.', 'Scrambled eggs with fresh herbs.', 6.5],
      ['107. Rührei mit Feta-Käse und Tomaten', '۱۰۷. تخم‌مرغ با فتا و گوجه', '107. Scrambled Eggs with Feta and Tomatoes', 'Rührei mit Feta-Käse und Tomaten.', 'تخم‌مرغ هم‌زده با پنیر فتا و گوجه‌فرنگی.', 'Scrambled eggs with Feta cheese and tomatoes.', 6.9],
      ['108. Rührei mit Speck', '۱۰۸. تخم‌مرغ با بیکن', '108. Scrambled Eggs with Bacon', 'Rührei mit Speck.', 'تخم‌مرغ هم‌زده با بیکن.', 'Scrambled eggs with bacon.', 6.9],
      ['109. Rührei mit Schinken', '۱۰۹. تخم‌مرغ با ژامبون', '109. Scrambled Eggs with Ham', 'Rührei mit Schinken.', 'تخم‌مرغ هم‌زده با ژامبون.', 'Scrambled eggs with ham.', 6.9],
      ['110. Rührei mit Champignons', '۱۱۰. تخم‌مرغ با قارچ', '110. Scrambled Eggs with Mushrooms', 'Rührei mit Champignons.', 'تخم‌مرغ هم‌زده با قارچ.', 'Scrambled eggs with mushrooms.', 6.9],
      ['111. Rührei mit Spinat und Feta-Käse', '۱۱۱. تخم‌مرغ با اسفناج و فتا', '111. Scrambled Eggs with Spinach and Feta', 'Rührei mit Spinat und Feta-Käse.', 'تخم‌مرغ هم‌زده با اسفناج و پنیر فتا.', 'Scrambled eggs with spinach and Feta cheese.', 6.9],
      ['112. Rührei mit Lachs', '۱۱۲. تخم‌مرغ با سالمون', '112. Scrambled Eggs with Salmon', 'Rührei mit Lachs.', 'تخم‌مرغ هم‌زده با ماهی سالمون.', 'Scrambled eggs with salmon.', 7.6],
      ['113. Zwei Spiegeleier Natur', '۱۱۳. دو نیمرو ساده', '113. Two Fried Eggs Natural', 'Zwei Spiegeleier Natur.', 'دو عدد نیمرو ساده.', 'Two natural fried eggs.', 4.6],
      ['114. Zwei Spiegeleier mit Bacon', '۱۱۴. دو نیمرو با بیکن', '114. Two Fried Eggs with Bacon', 'Zwei Spiegeleier mit Bacon.', 'دو عدد نیمرو با بیکن.', 'Two fried eggs with bacon.', 5.9],
      ['115. Müsli', '۱۱۵. موزلی', '115. Muesli', 'Müsli mit Natur- oder Fruchtjoghurt und Obst.', 'موزلی با ماست ساده یا میوه‌ای و میوه تازه.', 'Muesli with natural or fruit yoghurt and fruit.', 5.6],
      ['116. Frischer Obstsalat', '۱۱۶. سالاد میوه تازه', '116. Fresh Fruit Salad', 'Frischer Obstsalat.', 'سالاد میوه تازه.', 'Fresh fruit salad.', 4.9],
    ],
  },
  {
    slug: 'extras',
    items: [
      ['126. Brötchen', '۱۲۶. نان رول', '126. Bread Roll', 'Brötchen.', 'نان رول.', 'Bread roll.', 0.5],
      ['127. Butter', '۱۲۷. کره', '127. Butter', 'Butter.', 'کره.', 'Butter.', 1.0],
      ['128. Konfitüre, Honig, Nutella', '۱۲۸. مربا، عسل، نوتلا', '128. Jam, Honey, Nutella', 'Konfitüre, Honig oder Nutella.', 'مربا، عسل یا نوتلا.', 'Jam, honey, or Nutella.', 1.0],
      ['129. Gekochtes Ei / Bio', '۱۲۹. تخم‌مرغ آب‌پز', '129. Boiled Egg / Organic', 'Gekochtes Ei.', 'تخم‌مرغ آب‌پز.', 'Boiled egg.', 1.2],
    ],
  },
  {
    slug: 'eisbecher',
    items: [
      ['Kirsch-Becher', 'جام بستنی گیلاس', 'Cherry Sundae', 'Milch- und Fruchteis, Kirschen, Topping und Sahne.', 'بستنی شیر و میوه، گیلاس، تاپینگ و خامه.', 'Milk and fruit ice cream, cherries, topping, and cream.', 7.5],
      ['Raffaello-Becher', 'جام بستنی رافائلو', 'Raffaello Sundae', 'Milcheis mit Schokosoße, Raffaellokugel und Sahne.', 'بستنی شیری با سس شکلات، توپک رافائلو و خامه.', 'Milk ice cream with chocolate sauce, Raffaello ball, and cream.', 7.8],
      ['Krokant-Becher', 'جام بستنی کروکانت', 'Brittle Sundae', 'Milcheis, Krokant, Amarettinis, Topping und Sahne.', 'بستنی شیری، کروکانت، بیسکویت آمارتینی، تاپینگ و خامه.', 'Milk ice cream, brittle, Amarettini biscuits, topping, and cream.', 7.5],
      ['Schoko-Becher', 'جام بستنی شکلاتی', 'Chocolate Sundae', 'Milch- und Schokoeis, Schokosoße und Sahne.', 'بستنی شیری و شکلاتی، سس شکلات و خامه.', 'Milk and chocolate ice cream, chocolate sauce, and cream.', 7.5],
      ['Schoko-Becher Spezial', 'جام بستنی شکلاتی ویژه', 'Special Chocolate Sundae', 'Eierlikör, Milch- und Schokoeis, Schokosoße und Sahne.', 'لیکور تخم‌مرغ، بستنی شیری و شکلاتی، سس شکلات و خامه.', 'Egg liqueur, milk and chocolate ice cream, chocolate sauce, and cream.', 8.9],
      ['Erdbeer-Becher', 'جام بستنی توت‌فرنگی', 'Strawberry Sundae', 'Milch- und Fruchteis, Erdbeeren, Topping und Sahne.', 'بستنی شیری و میوه‌ای، توت‌فرنگی، تاپینگ و خامه.', 'Milk and fruit ice cream, strawberries, topping, and cream.', 7.9],
      ['Bananasplit', 'بنانا اسپلیت', 'Banana Split', 'Bananen, Milcheis, Kirschen, Schokosoße und Sahne.', 'موز، بستنی شیری، گیلاس، سس شکلات و خامه.', 'Bananas, milk ice cream, cherries, chocolate sauce, and cream.', 7.9],
      ['After-Eight-Becher', 'جام بستنی افتر ایت', 'After Eight Sundae', 'Schoko- und Pfefferminzeis, Minzlikör, Minzblättchen, Schokotopping und Sahne.', 'بستنی شکلاتی و نعنا فلفلی، لیکور نعنا، برگ نعنا، تاپینگ شکلاتی و خامه.', 'Chocolate and peppermint ice cream, mint liqueur, mint leaves, chocolate topping, and cream.', 7.9],
      ['Walnuss-Becher', 'جام بستنی گردو', 'Walnut Sundae', 'Milch- und Nusseis, Walnüsse, karamellisierte Walnüsse, Nusstopping und Sahne.', 'بستنی شیری و گردویی، گردو، گردوی کاراملی، تاپینگ مغزیجات و خامه.', 'Milk and nut ice cream, walnuts, caramelized walnuts, nut topping, and cream.', 7.9],
      ['Schweden-Becher', 'جام بستنی سوئدی', 'Swedish Sundae', 'Milcheis, Eierlikör, Topping und Sahne.', 'بستنی شیری، لیکور تخم‌مرغ، تاپینگ و خامه.', 'Milk ice cream, egg liqueur, topping, and cream.', 7.9],
      ['Haselnuss-Becher', 'جام بستنی فندق', 'Hazelnut Sundae', 'Milch- und Nusseis, Haselnusskerne, Nusstopping und Sahne.', 'بستنی شیری و مغزیجات، مغز فندق، تاپینگ مغزیجات و خامه.', 'Milk and nut ice cream, hazelnut kernels, nut topping, and cream.', 7.9],
      ['Tropical-Becher', 'جام بستنی استوایی', 'Tropical Sundae', 'Gemischtes Eis, tropische Früchte, Topping und Sahne.', 'بستنی مخلوط، میوه‌های استوایی، تاپینگ و خامه.', 'Mixed ice cream, tropical fruits, topping, and cream.', 9.9],
      ['1 Kugel Eis', 'یک اسکوپ بستنی', '1 Scoop of Ice Cream', 'Eine Kugel Eis.', 'یک اسکوپ بستنی.', '1 scoop of ice cream.', 1.6],
      ['Eine Portion Sahne', 'یک پرس خامه', 'Portion of Cream', 'Eine Portion Sahne.', 'یک پرس خامه فرم‌گرفته.', 'A portion of whipped cream.', 1.0],
      ['Kindereis Micky Maus', 'بستنی بچگانه میکی ماوس', 'Kids Ice Cream Mickey Mouse', 'Kugel Eis nach Wahl.', 'یک اسکوپ بستنی به انتخاب شما.', 'Scoop of ice cream of your choice.', 4.9],
      ['Kindereis Pinnochio', 'بستنی بچگانه پینوکیو', 'Kids Ice Cream Pinocchio', 'Kugel Eis nach Wahl.', 'یک اسکوپ بستنی به انتخاب شما.', 'Scoop of ice cream of your choice.', 4.9],
      ['Warmer Apfelstrudel', 'اشترودل سیب گرم', 'Warm Apple Strudel', 'Mit Vanilleeis und Sahne.', 'با بستنی وانیلی و خامه.', 'With vanilla ice cream and cream.', 5.5],
      ['Eisschokolade', 'شکلات یخ', 'Ice Chocolate', 'Schokoeis und Sahne.', 'بستنی شکلاتی و خامه.', 'Chocolate ice cream and cream.', 5.5],
      ['Eis-Kaffee', 'قهوه یخ', 'Ice Coffee', 'Milcheis, Kaffee und Sahne.', 'بستنی شیری، قهوه و خامه.', 'Milk ice cream, coffee, and cream.', 5.5],
      ['Milch-Mix', 'میلک‌میکس', 'Milk Mix', 'Eissorten nach Wahl.', 'بستنی با طعم‌های دلخواه.', 'Ice cream flavors of your choice.', 5.5],
      ['Der Hipper', 'دِر هیپر', 'The Hipper', 'Milcheis, Orangennektar, Amarenakirsche und Sahne.', 'بستنی شیری، نکتار پرتقال، گیلاس آمارنا و خامه.', 'Milk ice cream, orange nectar, Amarena cherry, and cream.', 5.9],
    ],
  },
  {
    slug: 'alcoholic-drinks',
    items: [
      ['Ramazzotti Rosato Tonic', 'رامازوتی روزاتو تونیک', 'Ramazzotti Rosato Tonic', 'Ramazzotti Aperitivo Rosato, Tonic Water und Limettenspalten.', 'رامازوتی آپریتیوو روزاتو، تونیک واتر و برش‌های لیمو.', 'Ramazzotti Aperitivo Rosato, tonic water, and lime wedges.', 5.5],
      ['Ramazzotti Rosato Spritz', 'رامازوتی روزاتو اسپریتز', 'Ramazzotti Rosato Spritz', 'Ramazzotti Aperitivo Rosato, Prosecco und Basilikumblätter.', 'رامازوتی آپریتیوو روزاتو، پروسکو و برگ ریحان.', 'Ramazzotti Aperitivo Rosato, prosecco, and basil leaves.', 5.5],
      ['Lillet Berry', 'لیلت بری', 'Lillet Berry', 'Lillet Blanc, Wild Berry und Beeren.', 'لیلت بلانک، وایلد بری و توت‌ها.', 'Lillet Blanc, wild berry, and berries.', 5.9],
      ['Malfy Arancia Tonic', 'مالفی آرانچیا تونیک', 'Malfy Arancia Tonic', 'Malfy Gin Con Arancia, Tonic Water und Orangenscheibe.', 'جین مالفی آرانچیا، تونیک واتر و برش پرتقال.', 'Malfy Gin Con Arancia, tonic water, and orange slice.', 7.5],
      ['Ramazzotti Fresco Tonic', 'رامازوتی فرسکو تونیک', 'Ramazzotti Fresco Tonic', 'Ramazzotti Aperitivo Fresco, Tonic Water, Orangenscheibe und Thymian.', 'رامازوتی آپریتیوو فرسکو، تونیک واتر، برش پرتقال و آویشن.', 'Ramazzotti Aperitivo Fresco, tonic water, orange slice, and thyme.', 5.5],
      ['Ramazzotti Fresco Spritz', 'رامازوتی فرسکو اسپریتز', 'Ramazzotti Fresco Spritz', 'Ramazzotti Aperitivo Fresco, Prosecco, Zitronenscheibe und Minze.', 'رامازوتی آپریتیوو فرسکو، پروسکو، برش لیمو و نعناع.', 'Ramazzotti Aperitivo Fresco, prosecco, lemon slice, and mint.', 5.5],
      ['Absolut Sensations Limonade', 'ابسولوت سنسیشنز لیموناد', 'Absolut Sensations Lemonade', 'Absolut Sensations, Zitronenlimonade und Orangenscheibe.', 'ابسولوت سنسیشنز، لیموناد لیمویی و برش پرتقال.', 'Absolut Sensations, lemon soda, and orange slice.', 5.9],
    ],
  },
];

function normalizeItem(item) {
  if (!Array.isArray(item)) return item;
  const [nameDe, nameFa, nameEn, descriptionDe, descriptionFa, descriptionEn, price] = item;
  return {
    nameDe,
    nameFa,
    nameEn,
    descriptionDe,
    descriptionFa,
    descriptionEn,
    price,
    variants: SIZE_VARIANTS_BY_ITEM[nameDe],
  };
}

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

  for (const group of [...DEFAULT_ITEMS, ...LEGACY_MENU_ITEMS]) {
    const category = categoryBySlug[group.slug]
      ?? await prisma.menuCategory.findUnique({ where: { slug: group.slug } });
    if (!category) continue;

    for (const [index, item] of group.items.entries()) {
      const normalized = normalizeItem(item);
      const {
        nameDe,
        nameFa,
        nameEn,
        descriptionDe,
        descriptionFa,
        descriptionEn,
        price,
        variants = [],
      } = normalized;
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
        await replaceVariants(prisma, existing.id, variants);
        updatedItems += 1;
      } else {
        const created = await prisma.menuItem.create({ data });
        await replaceVariants(prisma, created.id, variants);
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

async function replaceVariants(prisma, menuItemId, variants = []) {
  if (!prisma.menuItemVariant) return;
  if (!Array.isArray(variants) || variants.length === 0) return;
  await prisma.menuItemVariant.deleteMany({ where: { menuItemId } });
  await prisma.menuItemVariant.createMany({
    data: variants.map((variant, index) => {
      const [labelDe, labelFa, labelEn, price] = Array.isArray(variant)
        ? variant
        : [variant.labelDe, variant.labelFa, variant.labelEn, variant.price];
      return {
        id: randomUUID(),
        menuItemId,
        labelDe,
        labelFa: labelFa || labelDe,
        labelEn: labelEn || labelDe,
        price,
        sortOrder: index + 1,
        isDefault: index === 0,
        isActive: true,
      };
    }),
  });
}

async function ensureDefaultMenu(prisma) {
  const [categoryCount, itemCount] = await Promise.all([
    prisma.menuCategory.count(),
    prisma.menuItem.count(),
  ]);

  const legacyExists = await prisma.menuItem.findFirst({ where: { nameDe: '120. Pour moi' } });
  const hasVariants = prisma.menuItemVariant ? await prisma.menuItemVariant.count() : 0;

  if (categoryCount > 0 && itemCount > 0 && legacyExists && hasVariants > 0) {
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

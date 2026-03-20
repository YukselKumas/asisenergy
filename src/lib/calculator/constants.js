// ── Sabit Değerler & Ürün Veritabanı ──────────────────────────────────
// Boru çapları, etiketler, vana eşleşmeleri ve fiyat listesi burada tanımlıdır.
// Fiyat listesi dinamik olarak Supabase'den de beslenebilir (bkz. definitionsStore).

// PPR boru çap sıralaması — küçükten büyüğe
export const DIAM_ORDER = [
  'q20','q25','q32','q40','q50','q63','q75','q90','q110',
  'q125','q140','q160','q180','q200','q225','q250',
];

// Çap ID → görüntüleme etiketi
export const DIAM_LABEL = {
  q20:'Q20', q25:'Q25', q32:'Q32', q40:'Q40', q50:'Q50',
  q63:'Q63', q75:'Q75', q90:'Q90', q110:'Q110', q125:'Q125',
  q140:'Q140', q160:'Q160', q180:'Q180', q200:'Q200', q225:'Q225', q250:'Q250',
};

// ── Ürün ID → Marka Kategorisi Eşleşmesi ──────────────────────────────
// Her ürünün hangi marka kategorisine ait olduğunu belirler.
// Böylece Step1'de seçilen marka sadece kendi kategorisindeki ürünleri etkiler.
export function productBrandCat(id) {
  if (id.startsWith('pir-v')) return 'valve';   // pirinç küresel vana
  if (id.startsWith('bd-'))  return 'bd';       // basınç düşürücü
  if (/^f\d/.test(id))       return 'filter';   // filtre (f34, f1, f114, ...)
  if (id.startsWith('cv'))   return 'filter';   // çekvalf
  if (id === 'pump' || id === 'mano' || id === 'air') return 'other';
  return 'ppr'; // boru, bağlantı, ppr vana, kolektör, union
}

// Marka kategorisi → config field eşleşmesi
export const BRAND_CAT_CONFIG = {
  ppr:    'markaPpr',
  valve:  'markaPirince',
  bd:     'markaBd',
  filter: 'markaFiltre',
};

// PPR çapı → Pirinç küresel vana ürün ID'si
export const PIR_VANA_MAP = {
  q20:'pir-v12',   // 1/2"
  q25:'pir-v34',   // 3/4"
  q32:'pir-v1',    // 1"
  q40:'pir-v114',  // 1 1/4"
  q50:'pir-v112',  // 1 1/2"
  q63:'pir-v2',    // 2"
  q75:'pir-v212',  // 2 1/2"
  q90:'pir-v3',    // 3"
  q110:'pir-v4',   // 4"
};

// PPR çapı → PPR küresel vana ürün ID'si
export const PPR_VANA_MAP = {
  q75:'ppr-v75', q63:'ppr-v63', q50:'ppr-v50',
  q40:'ppr-v40', q32:'ppr-v32', q25:'ppr-v25', q20:'ppr-v20',
};

// Kategori etiketleri
export const CAT_LABEL = {
  boru:'Boru', baglanti:'Bağlantı', vana:'Vana', mekanik:'Mekanik Oda',
};

// ── Kalde 12.01.2026 Fiyat Listesi ────────────────────────────────────
// Her kalem: { id, cat, n (isim), u (birim), list (liste fiyatı), disc (iskonto%) }
export const PRICES = [
  /* PP Boru PN20 */
  {id:'q110',cat:'boru', n:'110MM PP-R BORU PN20',              u:'m',    list:879.20, disc:0},
  {id:'q90', cat:'boru', n:'90MM PP-R BORU PN20',               u:'m',    list:592.04, disc:0},
  {id:'q75', cat:'boru', n:'75MM PP-R BORU PN20',               u:'m',    list:404.28, disc:0},
  {id:'q63', cat:'boru', n:'63MM PP-R BORU PN20',               u:'m',    list:275.97, disc:0},
  {id:'q50', cat:'boru', n:'50MM PP-R BORU PN20',               u:'m',    list:176.02, disc:0},
  {id:'q40', cat:'boru', n:'40MM PP-R BORU PN20',               u:'m',    list:113.49, disc:0},
  {id:'q32', cat:'boru', n:'32MM PP-R BORU PN20',               u:'m',    list:73.01,  disc:0},
  {id:'q25', cat:'boru', n:'25MM PP-R BORU PN20',               u:'m',    list:44.40,  disc:0},
  {id:'q20', cat:'boru', n:'20MM PP-R BORU PN20',               u:'m',    list:28.99,  disc:0},
  /* Dirsek 90° */
  {id:'e110',cat:'baglanti', n:'110MM DİRSEK 90°',              u:'adet', list:753.19, disc:0},
  {id:'e90', cat:'baglanti', n:'90MM DİRSEK 90°',               u:'adet', list:361.99, disc:0},
  {id:'e75', cat:'baglanti', n:'75MM DİRSEK 90°',               u:'adet', list:210.69, disc:0},
  {id:'e63', cat:'baglanti', n:'63MM DİRSEK 90°',               u:'adet', list:111.06, disc:0},
  {id:'e50', cat:'baglanti', n:'50MM DİRSEK 90°',               u:'adet', list:39.46,  disc:0},
  {id:'e40', cat:'baglanti', n:'40MM DİRSEK 90°',               u:'adet', list:22.22,  disc:0},
  {id:'e32', cat:'baglanti', n:'32MM DİRSEK 90°',               u:'adet', list:8.43,   disc:0},
  {id:'e25', cat:'baglanti', n:'25MM DİRSEK 90°',               u:'adet', list:4.29,   disc:0},
  {id:'e20', cat:'baglanti', n:'20MM DİRSEK 90°',               u:'adet', list:3.10,   disc:0},
  /* Te (Equal) */
  {id:'t110',cat:'baglanti', n:'110MM TE PP-R',                 u:'adet', list:845.67, disc:0},
  {id:'t90', cat:'baglanti', n:'90MM TE PP-R',                  u:'adet', list:489.99, disc:0},
  {id:'t75', cat:'baglanti', n:'75MM TE PP-R',                  u:'adet', list:302.55, disc:0},
  {id:'t63', cat:'baglanti', n:'63MM TE PP-R',                  u:'adet', list:134.41, disc:0},
  {id:'t50', cat:'baglanti', n:'50MM TE PP-R',                  u:'adet', list:54.42,  disc:0},
  {id:'t40', cat:'baglanti', n:'40MM TE PP-R',                  u:'adet', list:34.67,  disc:0},
  /* Redüksiyon */
  {id:'r11090',cat:'baglanti',n:'110×90 REDÜKSİYON PP-R',        u:'adet', list:312.00, disc:0},
  {id:'r9075', cat:'baglanti',n:'90×75 REDÜKSİYON PP-R',         u:'adet', list:248.00, disc:0},
  {id:'r9063', cat:'baglanti',n:'90×63 REDÜKSİYON PP-R',         u:'adet', list:198.00, disc:0},
  {id:'r9050', cat:'baglanti',n:'90×50 REDÜKSİYON PP-R',         u:'adet', list:172.00, disc:0},
  {id:'r7563',cat:'baglanti',n:'75×63 REDÜKSİYON PP-R',        u:'adet', list:113.17, disc:0},
  {id:'r7550',cat:'baglanti',n:'75×50 REDÜKSİYON PP-R',        u:'adet', list:90.04,  disc:0},
  {id:'r7540',cat:'baglanti',n:'75×40 REDÜKSİYON PP-R',        u:'adet', list:186.01, disc:0},
  {id:'r6350',cat:'baglanti',n:'63×50 REDÜKSİYON PP-R',        u:'adet', list:143.73, disc:0},
  {id:'r5040',cat:'baglanti',n:'50×40 REDÜKSİYON PP-R',        u:'adet', list:56.29,  disc:0},
  {id:'r4032',cat:'baglanti',n:'40×32 REDÜKSİYON PP-R',        u:'adet', list:11.24,  disc:0},
  {id:'r3225',cat:'baglanti',n:'32×25 REDÜKSİYON PP-R',        u:'adet', list:11.48,  disc:0},
  {id:'r2520',cat:'baglanti',n:'25×20 REDÜKSİYON PP-R',        u:'adet', list:8.50,   disc:0},
  /* Manşon */
  {id:'m110',cat:'baglanti', n:'110MM MANŞON PP-R',             u:'adet', list:319.18, disc:0},
  {id:'m90', cat:'baglanti', n:'90MM MANŞON PP-R',              u:'adet', list:193.88, disc:0},
  {id:'m75', cat:'baglanti', n:'75MM MANŞON PP-R',              u:'adet', list:126.11, disc:0},
  {id:'m63', cat:'baglanti', n:'63MM MANŞON PP-R',              u:'adet', list:59.20,  disc:0},
  {id:'m50', cat:'baglanti', n:'50MM MANŞON PP-R',              u:'adet', list:24.54,  disc:0},
  {id:'m40', cat:'baglanti', n:'40MM MANŞON PP-R',              u:'adet', list:14.71,  disc:0},
  {id:'m32', cat:'baglanti', n:'32MM MANŞON PP-R',              u:'adet', list:6.80,   disc:0},
  {id:'m25', cat:'baglanti', n:'25MM MANŞON PP-R',              u:'adet', list:3.41,   disc:0},
  {id:'m20', cat:'baglanti', n:'20MM MANŞON PP-R',              u:'adet', list:2.60,   disc:0},
  /* Kapama Başlığı (Kep) */
  {id:'kep110',cat:'baglanti',n:'110MM KAPAMA BAŞLIĞI PP-R',    u:'adet', list:0,      disc:0},
  {id:'kep90', cat:'baglanti',n:'90MM KAPAMA BAŞLIĞI PP-R',     u:'adet', list:0,      disc:0},
  {id:'kep75', cat:'baglanti',n:'75MM KAPAMA BAŞLIĞI PP-R',     u:'adet', list:0,      disc:0},
  {id:'kep63', cat:'baglanti',n:'63MM KAPAMA BAŞLIĞI PP-R',     u:'adet', list:0,      disc:0},
  {id:'kep50', cat:'baglanti',n:'50MM KAPAMA BAŞLIĞI PP-R',     u:'adet', list:0,      disc:0},
  {id:'kep40', cat:'baglanti',n:'40MM KAPAMA BAŞLIĞI PP-R',     u:'adet', list:0,      disc:0},
  /* PPR Küresel Vana */
  {id:'ppr-v75',cat:'vana',n:'75MM KÜRESEL VANA PP-R',          u:'adet', list:1810.58,disc:0},
  {id:'ppr-v63',cat:'vana',n:'63MM KÜRESEL VANA PP-R',          u:'adet', list:1594.19,disc:0},
  {id:'ppr-v50',cat:'vana',n:'50MM KÜRESEL VANA PP-R',          u:'adet', list:984.25, disc:0},
  {id:'ppr-v40',cat:'vana',n:'40MM KÜRESEL VANA PP-R',          u:'adet', list:542.18, disc:0},
  {id:'ppr-v32',cat:'vana',n:'32MM KÜRESEL VANA PP-R',          u:'adet', list:202.46, disc:0},
  {id:'ppr-v25',cat:'vana',n:'25MM KÜRESEL VANA PP-R',          u:'adet', list:135.74, disc:0},
  {id:'ppr-v20',cat:'vana',n:'20MM KÜRESEL VANA PP-R',          u:'adet', list:98.49,  disc:0},
  /* Pirinç Küresel Vana */
  {id:'pir-v4',  cat:'vana',n:'4" PİRİNÇ KÜRESEL VANA (Q110)',  u:'adet', list:4800.00,disc:0},
  {id:'pir-v3',  cat:'vana',n:'3" PİRİNÇ KÜRESEL VANA (Q90)',   u:'adet', list:3200.00,disc:0},
  {id:'pir-v212',cat:'vana',n:'2½" PİRİNÇ KÜRESEL VANA (Q75)',  u:'adet', list:2200.00,disc:0},
  {id:'pir-v2',  cat:'vana',n:'2" PİRİNÇ KÜRESEL VANA (Q63)',   u:'adet', list:1400.00,disc:0},
  {id:'pir-v112',cat:'vana',n:'1½" PİRİNÇ KÜRESEL VANA (Q50)',  u:'adet', list:820.00, disc:0},
  {id:'pir-v114',cat:'vana',n:'1¼" PİRİNÇ KÜRESEL VANA (Q40)',  u:'adet', list:560.00, disc:0},
  {id:'pir-v1',  cat:'vana',n:'1" PİRİNÇ KÜRESEL VANA (Q32)',   u:'adet', list:380.00, disc:0},
  {id:'pir-v34', cat:'vana',n:'¾" PİRİNÇ KÜRESEL VANA (Q25)',   u:'adet', list:245.00, disc:0},
  {id:'pir-v12', cat:'vana',n:'½" PİRİNÇ KÜRESEL VANA (Q20)',   u:'adet', list:165.00, disc:0},
  /* Oynar Başlı Rakor */
  {id:'saatrek25',cat:'baglanti',n:'¾" OYNAR BAŞLI RAKOR (Q25)',  u:'adet', list:190.57, disc:0},
  {id:'saatrek32',cat:'baglanti',n:'1" OYNAR BAŞLI RAKOR (Q32)',   u:'adet', list:229.35, disc:0},
  {id:'saatrek40',cat:'baglanti',n:'1¼" OYNAR BAŞLI RAKOR (Q40)',  u:'adet', list:407.50, disc:0},
  {id:'saatrek50',cat:'baglanti',n:'1½" OYNAR BAŞLI RAKOR (Q50)',  u:'adet', list:580.00, disc:0},
  {id:'saatrek63',cat:'baglanti',n:'2" OYNAR BAŞLI RAKOR (Q63)',   u:'adet', list:820.00, disc:0},
  {id:'saatrek75',cat:'baglanti',n:'2½" OYNAR BAŞLI RAKOR (Q75)',  u:'adet', list:1150.00,disc:0},
  {id:'saatrek90',cat:'baglanti',n:'3" OYNAR BAŞLI RAKOR (Q90)',   u:'adet', list:1650.00,disc:0},
  /* Dış Dişli Adaptör */
  {id:'ada25',cat:'baglanti',n:'¾" DIŞ DİŞLİ ADAPTÖR PP-R (Q25)', u:'adet', list:38.50,  disc:0},
  {id:'ada32',cat:'baglanti',n:'1" DIŞ DİŞLİ ADAPTÖR PP-R (Q32)',  u:'adet', list:52.00,  disc:0},
  {id:'ada40',cat:'baglanti',n:'1¼" DIŞ DİŞLİ ADAPTÖR PP-R (Q40)',u:'adet', list:78.00,  disc:0},
  {id:'ada50',cat:'baglanti',n:'1½" DIŞ DİŞLİ ADAPTÖR PP-R (Q50)',u:'adet', list:105.00, disc:0},
  {id:'ada63',cat:'baglanti',n:'2" DIŞ DİŞLİ ADAPTÖR PP-R (Q63)', u:'adet', list:162.00, disc:0},
  {id:'ada75',cat:'baglanti',n:'2½" DIŞ DİŞLİ ADAPTÖR PP-R (Q75)',u:'adet', list:248.00, disc:0},
  {id:'ada90',cat:'baglanti',n:'3" DIŞ DİŞLİ ADAPTÖR PP-R (Q90)', u:'adet', list:390.00, disc:0},
  /* İnegal Te — ana×çıkış×ana */
  {id:'ite11090',cat:'baglanti',n:'110×90×110 İNEGAL TE PP-R',   u:'adet', list:520.00, disc:0},
  {id:'ite11075',cat:'baglanti',n:'110×75×110 İNEGAL TE PP-R',   u:'adet', list:460.00, disc:0},
  {id:'ite11063',cat:'baglanti',n:'110×63×110 İNEGAL TE PP-R',   u:'adet', list:420.00, disc:0},
  {id:'ite11050',cat:'baglanti',n:'110×50×110 İNEGAL TE PP-R',   u:'adet', list:380.00, disc:0},
  {id:'ite9075', cat:'baglanti',n:'90×75×90 İNEGAL TE PP-R',     u:'adet', list:320.00, disc:0},
  {id:'ite9063', cat:'baglanti',n:'90×63×90 İNEGAL TE PP-R',     u:'adet', list:280.00, disc:0},
  {id:'ite9050', cat:'baglanti',n:'90×50×90 İNEGAL TE PP-R',     u:'adet', list:240.00, disc:0},
  {id:'ite9040', cat:'baglanti',n:'90×40×90 İNEGAL TE PP-R',     u:'adet', list:210.00, disc:0},
  {id:'ite9032', cat:'baglanti',n:'90×32×90 İNEGAL TE PP-R',     u:'adet', list:190.00, disc:0},
  {id:'ite7563', cat:'baglanti',n:'75×63×75 İNEGAL TE PP-R',     u:'adet', list:185.05, disc:0},
  {id:'ite7550', cat:'baglanti',n:'75×50×75 İNEGAL TE PP-R',     u:'adet', list:160.00, disc:0},
  {id:'ite7540', cat:'baglanti',n:'75×40×75 İNEGAL TE PP-R',     u:'adet', list:145.00, disc:0},
  {id:'ite7532', cat:'baglanti',n:'75×32×75 İNEGAL TE PP-R',     u:'adet', list:130.00, disc:0},
  {id:'ite6350', cat:'baglanti',n:'63×50×63 İNEGAL TE PP-R',     u:'adet', list:185.05, disc:0},
  {id:'ite6340', cat:'baglanti',n:'63×40×63 İNEGAL TE PP-R',     u:'adet', list:145.00, disc:0},
  {id:'ite6332', cat:'baglanti',n:'63×32×63 İNEGAL TE PP-R',     u:'adet', list:120.00, disc:0},
  {id:'ite5040', cat:'baglanti',n:'50×40×50 İNEGAL TE PP-R',     u:'adet', list:38.87,  disc:0},
  {id:'ite5032', cat:'baglanti',n:'50×32×50 İNEGAL TE PP-R',     u:'adet', list:35.00,  disc:0},
  {id:'ite4032', cat:'baglanti',n:'40×32×40 İNEGAL TE PP-R',     u:'adet', list:38.00,  disc:0},
  {id:'ite4025', cat:'baglanti',n:'40×25×40 İNEGAL TE PP-R',     u:'adet', list:30.00,  disc:0},
  /* Sarı Nipel */
  {id:'n114',    cat:'baglanti',n:'1¼" SARI NİPEL',              u:'adet', list:280.38, disc:0},
  {id:'n34',     cat:'baglanti',n:'¾" SARI NİPEL',               u:'adet', list:75.56,  disc:0},
  /* PPR Kolektörler */
  {id:'kol-ppr-250',cat:'mekanik',n:'250MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-225',cat:'mekanik',n:'225MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-200',cat:'mekanik',n:'200MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-180',cat:'mekanik',n:'180MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-160',cat:'mekanik',n:'160MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-140',cat:'mekanik',n:'140MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-125',cat:'mekanik',n:'125MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-110',cat:'mekanik',n:'110MM PPR KOLEKTÖR',        u:'adet', list:0, disc:0},
  {id:'kol-ppr-90', cat:'mekanik',n:'90MM PPR KOLEKTÖR',         u:'adet', list:0, disc:0},
  {id:'kol-ppr-75', cat:'mekanik',n:'75MM PPR KOLEKTÖR',         u:'adet', list:0, disc:0},
  {id:'kol-ppr-63', cat:'mekanik',n:'63MM PPR KOLEKTÖR',         u:'adet', list:0, disc:0},
  {id:'kol-ppr-50', cat:'mekanik',n:'50MM PPR KOLEKTÖR',         u:'adet', list:0, disc:0},
  /* Paslanmaz Çelik Kolektörler */
  {id:'kol-pas-250',cat:'mekanik',n:'250MM PASLANMAZ KOLEKTÖR',  u:'adet', list:0, disc:0},
  {id:'kol-pas-110',cat:'mekanik',n:'110MM PASLANMAZ KOLEKTÖR',  u:'adet', list:0, disc:0},
  {id:'kol-pas-90', cat:'mekanik',n:'90MM PASLANMAZ KOLEKTÖR',   u:'adet', list:0, disc:0},
  {id:'kol-pas-75', cat:'mekanik',n:'75MM PASLANMAZ KOLEKTÖR',   u:'adet', list:0, disc:0},
  {id:'kol-pas-63', cat:'mekanik',n:'63MM PASLANMAZ KOLEKTÖR',   u:'adet', list:0, disc:0},
  {id:'kol-pas-50', cat:'mekanik',n:'50MM PASLANMAZ KOLEKTÖR',   u:'adet', list:0, disc:0},
  /* Filtre & Çekvalf */
  {id:'f114', cat:'mekanik',n:'1¼" FİLTRE',                      u:'adet', list:291.78, disc:0},
  {id:'f34',  cat:'mekanik',n:'¾" FİLTRE',                       u:'adet', list:194.51, disc:0},
  {id:'f1',   cat:'mekanik',n:'1" FİLTRE',                       u:'adet', list:0,      disc:0},
  {id:'f112', cat:'mekanik',n:'1½" FİLTRE',                      u:'adet', list:0,      disc:0},
  {id:'f2',   cat:'mekanik',n:'2" FİLTRE',                       u:'adet', list:620.00, disc:0},
  {id:'f212', cat:'mekanik',n:'2½" FİLTRE',                      u:'adet', list:0,      disc:0},
  {id:'f3',   cat:'mekanik',n:'3" FİLTRE',                       u:'adet', list:0,      disc:0},
  {id:'f4',   cat:'mekanik',n:'4" FİLTRE',                       u:'adet', list:0,      disc:0},
  {id:'cv114',cat:'mekanik',n:'1¼" ÇEKVALF',                     u:'adet', list:475.00, disc:0},
  {id:'cv34', cat:'mekanik',n:'¾" ÇEKVALF',                      u:'adet', list:310.00, disc:0},
  {id:'cv1',  cat:'mekanik',n:'1" ÇEKVALF',                      u:'adet', list:380.00, disc:0},
  {id:'cv112',cat:'mekanik',n:'1½" ÇEKVALF',                     u:'adet', list:550.00, disc:0},
  {id:'cv2',  cat:'mekanik',n:'2" ÇEKVALF',                      u:'adet', list:780.00, disc:0},
  {id:'cv212',cat:'mekanik',n:'2½" ÇEKVALF',                     u:'adet', list:980.00, disc:0},
  {id:'cv3',  cat:'mekanik',n:'3" ÇEKVALF',                      u:'adet', list:1250.00,disc:0},
  /* Oynar Union */
  {id:'union32',cat:'mekanik',n:'1" PPR OYNAR UNION',            u:'adet', list:0,      disc:0},
  {id:'union40',cat:'mekanik',n:'1¼" PPR OYNAR UNION',           u:'adet', list:0,      disc:0},
  {id:'union50',cat:'mekanik',n:'1½" PPR OYNAR UNION',           u:'adet', list:0,      disc:0},
  {id:'union63',cat:'mekanik',n:'2" PPR OYNAR UNION',            u:'adet', list:0,      disc:0},
  /* Sabit ekipmanlar */
  {id:'pump', cat:'mekanik',n:'SİRKÜLASYON POMPASI',             u:'adet', list:10000.00,disc:0},
  {id:'mano', cat:'mekanik',n:'MANOMETRE 100mm 0-10 bar',        u:'adet', list:430.00, disc:0},
  {id:'air',  cat:'mekanik',n:'½" OTOMATİK HAVA TAHLİYE',        u:'adet', list:325.00, disc:0},
  /* Basınç Düşürücü */
  {id:'bd-34', cat:'mekanik',n:'¾" BASINÇ DÜŞÜRÜCÜ (DN20)',      u:'adet', list:1850.00,disc:0},
  {id:'bd-1',  cat:'mekanik',n:'1" BASINÇ DÜŞÜRÜCÜ (DN25)',      u:'adet', list:2400.00,disc:0},
  {id:'bd-114',cat:'mekanik',n:'1¼" BASINÇ DÜŞÜRÜCÜ (DN32)',     u:'adet', list:3200.00,disc:0},
];

// Fırat Boru fiyat listesi (product_id → liste fiyatı)
export const PRICES_FIRAT = {
  q20:19.59, q25:30.18, q32:55.15, q40:86.29, q50:137.95,
  q63:218.05, q75:311.47, q90:486.44, q110:725.85,
  e20:2.89,  e25:4.49,  e32:8.40,  e40:17.14, e50:30.59,
  e63:58.92, e75:83.63, e90:153.06, e110:261.03,
  m20:2.07,  m25:3.34,  m32:6.39,  m40:10.52, m50:16.69,
  m63:31.58, m75:57.32, m90:92.51, m110:155.74,
  t20:4.39,  t25:6.13,  t32:12.24, t40:20.36, t50:40.24,
  t63:77.06, t75:123.32, t90:208.24, t110:348.59,
  r3225:4.05, r4032:7.67, r5040:13.48, r6350:29.86,
  r7550:37.35, r7563:45.08,
  kep20:2.59, kep25:3.34, kep32:5.75, kep40:7.90,
  kep50:14.14, kep63:27.69, kep75:54.39, kep90:71.24, kep110:153.96,
  'ppr-v20':102.28, 'ppr-v25':128.46, 'ppr-v32':180.65,
  'ppr-v40':411.69, 'ppr-v50':504.67, 'ppr-v63':939.07, 'ppr-v75':1311.67,
  saatrek25:100.85, saatrek32:164.04, saatrek40:208.23,
  saatrek50:337.07, saatrek63:708.84, saatrek75:866.43, saatrek90:1292.22,
  ada25:44.74, ada32:84.44, ada40:193.48, ada50:253.91,
  ada63:410.43, ada75:726.65, ada90:1078.82,
  ite6350:83.58, ite6340:68.00, ite6332:58.00,
  ite5040:42.33, ite5032:36.00, ite4032:21.25, ite4025:18.00,
  f34:86.82, f1:138.71,
};

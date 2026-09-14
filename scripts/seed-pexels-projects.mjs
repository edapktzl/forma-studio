#!/usr/bin/env node

/**
 * Add the curated Pexels portfolio set through the same authenticated API
 * used by the admin panel. The script is safe to run repeatedly: reserved
 * pexels-* slugs and media filenames are skipped when they already exist.
 *
 * Required environment variables:
 *   SEED_API_URL       (default: https://api.edanurpektezel.com/api/v1)
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *
 * Examples:
 *   node scripts/seed-pexels-projects.mjs --dry-run
 *   node scripts/seed-pexels-projects.mjs
 *   node scripts/seed-pexels-projects.mjs --rollback
 */

const API = (process.env.SEED_API_URL || 'https://api.edanurpektezel.com/api/v1').replace(/\/$/, '');
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const mode = process.argv.includes('--rollback') ? 'rollback' : process.argv.includes('--dry-run') ? 'dry-run' : 'seed';

if (!email || !password) {
  throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running the seed script.');
}

const projects = [
  {
    slug: 'pexels-quiet-courtyard', category: 'residential', location: 'Urla, İzmir', area_sqm: 285, construction_year: 2024, featured: true,
    en: ['Quiet Courtyard', 'Residential · Architecture', 'A light-filled home organized around a shaded garden.', 'Shape a calm family home on a compact coastal plot.', 'Two quiet wings frame a planted courtyard and protect the interior from the afternoon sun.', 'A generous home where daily life moves easily between stone, planting and light.'],
    tr: ['Sakin Avlu', 'Konut · Mimari', 'Gölgeli bir bahçe etrafında şekillenen aydınlık bir ev.', 'Kıyıdaki kompakt bir parselde sakin ve ferah bir aile evi tasarlamak.', 'İki yalın kütle bitkili bir avluyu çevreliyor; iç mekânı öğleden sonra güneşinden koruyor.', 'Taş, bitki ve ışık arasında doğal geçişler kuran ferah bir ev.'],
    images: [276724, 323780, 157811],
  },
  {
    slug: 'pexels-harbor-house', category: 'residential', location: 'Bodrum, Muğla', area_sqm: 340, construction_year: 2023, featured: true,
    en: ['Harbor House', 'Residential · Interior design', 'A tactile retreat with long views toward the Aegean.', 'Bring a new-build house closer to its rocky shoreline setting.', 'Warm timber, pale stone and deep window seats create a sequence of sheltered rooms.', 'An understated interior that lets the horizon and changing light lead the experience.'],
    tr: ['Liman Evi', 'Konut · İç mimari', 'Ege’ye uzanan manzaralarla şekillenen dokulu bir yaşam alanı.', 'Yeni yapıyı kayalık kıyı çevresiyle daha güçlü bir ilişkiye kavuşturmak.', 'Sıcak ahşap, açık renk taş ve derin pencere oturmaları korunaklı odalar oluşturuyor.', 'Ufuk çizgisini ve değişen ışığı öne çıkaran yalın bir iç mekân.'],
    images: [259588, 1642125, 1457842],
  },
  {
    slug: 'pexels-north-light-studio', category: 'workplace', location: 'Karaköy, İstanbul', area_sqm: 760, construction_year: 2025, featured: true,
    en: ['North Light Studio', 'Workplace · Spatial strategy', 'A flexible studio for focused work, exchange and making.', 'Turn a deep office floor into a clear, welcoming home for a creative team.', 'Shared tables sit beneath the strongest daylight while smaller rooms support quiet work and calls.', 'A workplace that can change with the team without losing its sense of calm.'],
    tr: ['Kuzey Işığı Stüdyosu', 'Çalışma alanı · Mekânsal strateji', 'Odaklanma, paylaşım ve üretim için esnek bir stüdyo.', 'Derin bir ofis katını yaratıcı ekip için net ve davetkâr bir çalışma alanına dönüştürmek.', 'Ortak masalar güçlü gün ışığının altında; küçük odalar sessiz çalışma ve görüşmelere ayrılıyor.', 'Sakinliğini korurken ekiple birlikte değişebilen bir çalışma alanı.'],
    images: [1662137, 1170412, 209296],
  },
  {
    slug: 'pexels-olive-yard-retreat', category: 'hospitality', location: 'Datça, Muğla', area_sqm: 920, construction_year: 2022, featured: false,
    en: ['Olive Yard Retreat', 'Hospitality · Interior design', 'A small guesthouse rooted in shade, craft and quiet rituals.', 'Give a coastal stay a memorable identity without over-designing it.', 'Rooms open onto planted terraces, with local stone and woven details carrying the same palette throughout.', 'A relaxed sequence of spaces that feels discovered rather than staged.'],
    tr: ['Zeytinlik Konaklama', 'Konaklama · İç mimari', 'Gölge, zanaat ve sakin ritüellerle köklenen küçük bir konukevi.', 'Kıyıdaki konaklama alanına abartıya kaçmadan akılda kalan bir kimlik kazandırmak.', 'Odalar bitkili teraslara açılıyor; yerel taş ve dokuma detaylar paleti bütünlüyor.', 'Kurgulanmış değil keşfedilmiş hissi veren rahat bir mekân dizisi.'],
    images: [534151, 703160, 439227],
  },
  {
    slug: 'pexels-woven-office', category: 'workplace', location: 'Bomonti, İstanbul', area_sqm: 540, construction_year: 2024, featured: false,
    en: ['Woven Office', 'Workplace · Interior design', 'A measured office interior built around movement and daylight.', 'Make a compact floor feel open while giving every team a place to focus.', 'A continuous timber screen organizes storage, meeting rooms and circulation without closing the plan.', 'A warm, legible workplace with room for both concentration and conversation.'],
    tr: ['Örgü Ofis', 'Çalışma alanı · İç mimari', 'Hareket ve gün ışığı etrafında ölçülü bir ofis iç mekânı.', 'Kompakt bir katı açık hissettirirken her ekibe odaklanabileceği bir alan sunmak.', 'Kesintisiz ahşap ekran depolama, toplantı odaları ve dolaşımı planı kapatmadan düzenliyor.', 'Odaklanmaya ve sohbete alan açan sıcak, anlaşılır bir çalışma ortamı.'],
    images: [280222, 2988860, 221047],
  },
  {
    slug: 'pexels-tide-house', category: 'residential', location: 'Kaş, Antalya', area_sqm: 410, construction_year: 2023, featured: false,
    en: ['Tide House', 'Residential · Architecture', 'A low coastal house tuned to sun, wind and changing seasons.', 'Create privacy without turning the house away from the sea.', 'Courtyard walls and deep roof lines filter the strongest light while keeping the living spaces open to the view.', 'A durable coastal home that feels quietly connected to its landscape.'],
    tr: ['Gelgit Evi', 'Konut · Mimari', 'Güneşe, rüzgâra ve mevsimlere uyumlanan alçak bir kıyı evi.', 'Evi denizden uzaklaştırmadan mahremiyet sağlamak.', 'Avlu duvarları ve derin saçaklar güçlü ışığı filtrelerken yaşam alanlarını manzaraya açık tutuyor.', 'Peyzajıyla sakin bir bağ kuran dayanıklı bir kıyı evi.'],
    images: [323705, 1457847, 271624],
  },
  {
    slug: 'pexels-open-gallery', category: 'hospitality', location: 'Beyoğlu, İstanbul', area_sqm: 680, construction_year: 2021, featured: false,
    en: ['Open Gallery', 'Culture · Adaptive reuse', 'A former workshop made into a generous home for exhibitions.', 'Retain the memory of an industrial shell while making it welcoming for new audiences.', 'Existing structure remains visible; movable walls and carefully placed light keep the plan adaptable.', 'A gallery with enough character to hold different voices and changing programmes.'],
    tr: ['Açık Galeri', 'Kültür · Yeniden kullanım', 'Eski bir atölyeyi sergiler için cömert bir buluşma alanına dönüştürmek.', 'Endüstriyel kabuğun hafızasını korurken yeni ziyaretçiler için davetkâr bir ortam kurmak.', 'Mevcut taşıyıcı sistem görünür bırakıldı; hareketli duvarlar ve kontrollü ışık planı esnek tutuyor.', 'Farklı seslere ve değişen programlara alan açan karakterli bir galeri.'],
    images: [1457844, 1022936, 259280],
  },
  {
    slug: 'pexels-limestone-atelier', category: 'workplace', location: 'Nişantaşı, İstanbul', area_sqm: 320, construction_year: 2024, featured: false,
    en: ['Limestone Atelier', 'Workplace · Interior design', 'A compact atelier where material and process stay visible.', 'Build a client-facing studio that feels precise, practical and personal.', 'A restrained limestone palette is paired with open shelving, soft task light and robust work surfaces.', 'A workplace that makes the work itself part of the welcome.'],
    tr: ['Kireçtaşı Atölye', 'Çalışma alanı · İç mimari', 'Malzemenin ve üretim sürecinin görünür kaldığı kompakt bir atölye.', 'Müşterileri karşılayan stüdyoyu kesin, pratik ve kişisel hissettirmek.', 'Sade kireçtaşı paleti; açık raflar, yumuşak çalışma ışığı ve dayanıklı yüzeylerle tamamlanıyor.', 'Üretimin kendisini karşılamanın bir parçası yapan bir çalışma alanı.'],
    images: [271667, 1571460, 206064],
  },
  {
    slug: 'pexels-patio-house', category: 'residential', location: 'Alaçatı, İzmir', area_sqm: 255, construction_year: 2022, featured: false,
    en: ['Patio House', 'Residential · Renovation', 'A modest renovation shaped by light, proportion and everyday use.', 'Open an existing stone house to contemporary family life without erasing its character.', 'The plan is clarified around a small patio; built-in storage keeps the rooms calm and useful.', 'A familiar house with a lighter rhythm and a stronger connection to the garden.'],
    tr: ['Patio Evi', 'Konut · Yenileme', 'Işık, oran ve günlük kullanım etrafında şekillenen yalın bir yenileme.', 'Mevcut taş evin karakterini koruyarak çağdaş aile yaşamına açmak.', 'Plan küçük bir patio etrafında netleştirildi; gömme depolama odaları sakin ve kullanışlı tutuyor.', 'Bahçeyle daha güçlü bağ kuran, ritmi hafifletilmiş tanıdık bir ev.'],
    images: [262367, 1763075, 2029667],
  },
  {
    slug: 'pexels-earth-material-house', category: 'residential', location: 'Ayvalık, Balıkesir', area_sqm: 365, construction_year: 2025, featured: false,
    en: ['Earth Material House', 'Residential · Architecture and interiors', 'A grounded home built around honest materials and slow mornings.', 'Use a limited palette to make a new house feel connected to its rural setting.', 'Clay plaster, oak and local stone create a soft background for changing light and daily life.', 'A warm, quiet home that will gain character with time.'],
    tr: ['Toprak Malzeme Evi', 'Konut · Mimari ve iç mimari', 'Gerçek malzemeler ve yavaş sabahlar etrafında kurulan köklü bir ev.', 'Sınırlı bir palet kullanarak yeni yapıyı kırsal çevresiyle ilişkilendirmek.', 'Kil sıva, meşe ve yerel taş; değişen ışık ve günlük yaşam için yumuşak bir arka plan oluşturuyor.', 'Zamanla karakter kazanacak sıcak ve sakin bir ev.'],
    images: [1743227, 262405, 2047905],
  },
];

const jar = new Map();

function setCookies(response) {
  const cookies = response.headers.getSetCookie?.() || (response.headers.get('set-cookie') || '').split(/,(?=[^;]+=[^;]+)/).filter(Boolean);
  for (const value of cookies) {
    const [pair] = value.split(';');
    const index = pair.indexOf('=');
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

function csrfToken() { return jar.get('csrf_token') || ''; }

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const method = (options.method || 'GET').toUpperCase();
  if (jar.size) headers.set('cookie', cookieHeader());
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-CSRF-Token', csrfToken());
  let body = options.body;
  if (body && !(body instanceof FormData) && !(body instanceof Blob)) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(`${API}${path}`, { ...options, method, headers, body });
  setCookies(response);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${method} ${path} failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function login() {
  const csrf = await api('/auth/csrf');
  if (csrf?.csrf_token && !csrfToken()) jar.set('csrf_token', csrf.csrf_token);
  await api('/auth/login', { method: 'POST', body: { email, password } });
}

async function mediaFor(imageId, filename, altText, dryRun) {
  const existing = mediaFor.existing.get(filename);
  if (existing) return existing.id;
  const url = `https://images.pexels.com/photos/${imageId}/pexels-photo-${imageId}.jpeg?auto=compress&cs=tinysrgb&w=2400&q=90`;
  if (dryRun) { console.log(`  media  ${filename} ← ${url}`); return 0; }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Pexels image ${imageId} returned ${response.status}.`);
  const blob = await response.blob();
  const form = new FormData();
  form.append('file', new File([blob], filename, { type: 'image/jpeg' }));
  const media = await api('/admin/media', { method: 'POST', body: form });
  mediaFor.existing.set(filename, media);
  return media.id;
}

async function seed() {
  await login();
  const [existingProjects, existingMedia, categories] = await Promise.all([
    api('/admin/projects'),
    api('/admin/media'),
    api('/admin/project-categories'),
  ]);
  mediaFor.existing = new Map(existingMedia.map((item) => [item.file_name, item]));
  const projectsBySlug = new Map(existingProjects.map((item) => [item.slug, item]));
  const categoryBySlug = new Map(categories.filter((item) => item.is_active !== false).map((item) => [item.slug, item]));
  for (const [index, project] of projects.entries()) {
    if (projectsBySlug.has(project.slug)) { console.log(`skip   ${project.slug} (already exists)`); continue; }
    const category = categoryBySlug.get(project.category);
    if (!category) throw new Error(`Missing active project category: ${project.category}`);
    console.log(`${mode === 'dry-run' ? 'plan  ' : 'add   '}${project.slug}`);
    const images = [];
    for (const [imageIndex, imageId] of project.images.entries()) {
      const filename = `${project.slug}-${imageIndex + 1}.jpg`;
      const mediaId = await mediaFor(imageId, filename, `${project.en[0]} architectural photograph ${imageIndex + 1}`, mode === 'dry-run');
      images.push({ media_id: mediaId, alt_text: `${project.en[0]} architectural photograph ${imageIndex + 1}`, is_cover: imageIndex === 0 });
    }
    if (mode === 'dry-run') continue;
    await api('/admin/projects', {
      method: 'POST',
      body: {
        slug: project.slug,
        category_id: category.id,
        location: project.location,
        area_sqm: project.area_sqm,
        construction_year: project.construction_year,
        is_featured: project.featured,
        status: 'published',
        images,
        translations: {
          en: { title: project.en[0], concept: project.en[1], short_description: project.en[2], challenge: project.en[3], approach: project.en[4], outcome: project.en[5], description: `${project.en[2]} ${project.en[4]} ${project.en[5]}` },
          tr: { title: project.tr[0], concept: project.tr[1], short_description: project.tr[2], challenge: project.tr[3], approach: project.tr[4], outcome: project.tr[5], description: `${project.tr[2]} ${project.tr[4]} ${project.tr[5]}` },
        },
      },
    });
  }
}

async function rollback() {
  await login();
  const items = await api('/admin/projects');
  const seeded = items.filter((item) => item.slug?.startsWith('pexels-'));
  if (!seeded.length) { console.log('No pexels-* projects found.'); return; }
  for (const item of seeded) { console.log(`remove ${item.slug}`); await api(`/admin/projects/${item.id}`, { method: 'DELETE' }); }
  console.log('Seeded projects were soft-deleted. Media is retained for recovery.');
}

await (mode === 'rollback' ? rollback() : seed());

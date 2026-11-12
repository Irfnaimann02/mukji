// #47: finds restaurants near a point with the Kakao Local API.
// The Kakao key stays on the server (secret KAKAO_REST_KEY), never in the app.
// Kakao's terms only allow storing the place ID, so nothing is saved here.

const KAKAO_URL = 'https://dapi.kakao.com/v2/local/search/category.json';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type KakaoDocument = {
  id: string;
  place_name: string;
  category_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  distance: string;
  place_url: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const key = Deno.env.get('KAKAO_REST_KEY');
  if (!key) return json({ error: 'KAKAO_REST_KEY is not set' }, 500);

  let body: { lat?: unknown; lng?: unknown; radius?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send JSON: { lat, lng, radius }' }, 400);
  }
  const { lat, lng, radius } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return json({ error: 'lat and lng must be numbers' }, 400);
  }

  // Kakao allows up to 20,000 m.
  const r = Math.min(Math.max(Math.round(typeof radius === 'number' ? radius : 1500), 100), 20000);

  // Kakao gives at most 3 pages of 15 places (45 in total), nearest first.
  const documents: KakaoDocument[] = [];
  for (let page = 1; page <= 3; page++) {
    const params = new URLSearchParams({
      category_group_code: 'FD6', // FD6 = restaurants
      x: String(lng),
      y: String(lat),
      radius: String(r),
      sort: 'distance',
      page: String(page),
      size: '15',
    });
    const res = await fetch(`${KAKAO_URL}?${params}`, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) return json({ error: `Kakao answered ${res.status}: ${await res.text()}` }, 502);

    const result = await res.json();
    documents.push(...result.documents);
    if (result.meta.is_end) break;
  }

  return json({
    places: documents.map((d) => ({
      id: d.id,
      name: d.place_name,
      category: d.category_name,
      phone: d.phone,
      address: d.road_address_name || d.address_name,
      lat: Number(d.y),
      lng: Number(d.x),
      meters: Number(d.distance),
      url: d.place_url,
    })),
  });
});
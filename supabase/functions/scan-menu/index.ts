// #10 part 2: Menu Scanner. Reads a photo of a menu and lists its dishes with the
// ingredients that are in them ("contains") or might be ("mayContain").
// The AI never decides safe / ask first / avoid: the app runs its own dishStatus
// on these ingredients for the user's profile. The user's profile is not sent here.
// Same secrets as explain-dish:
//   AI_PROVIDER = anthropic | openai | gemini   (team choice: anthropic)
//   AI_API_KEY  = the key for that provider
//   AI_MODEL    = the model name, e.g. claude-haiku-5-5
//   AI_SCAN_MODEL (optional) = a different model for reading photos; AI_MODEL is used if not set
// Kept as one file (no shared imports) so it can be deployed the same way as kakao-places.
// Returns { dishes: [{ nameKo, nameEn, priceWon, contains, mayContain }], notMenu }.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INGREDIENTS = ['pork', 'beef', 'chicken', 'lamb', 'seafood', 'egg', 'dairy', 'alcohol', 'peanut', 'wheat', 'soy'];
// Image types all three providers accept. HEIC is not one of them.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Claude rejects an image whose base64 text is over 5 MB. The app checks this too.
const MAX_BASE64_LENGTH = 5 * 1024 * 1024;
const MAX_DISHES = 40;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const text = (value: unknown, max = 80): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const pick = (value: unknown, allowed: string[]): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => allowed.includes(v)))] : [];

function systemPrompt(): string {
  return [
    'You read a photo of a restaurant menu in Korea for an app that helps diners with food restrictions',
    '(halal, vegan, no pork, allergies). The app decides later if each dish is safe for the user. Your job is only',
    'to list the dishes and their likely ingredients, as carefully as possible.',
    '',
    'For each dish or drink on the menu give:',
    '- "nameKo": the name exactly as written on the menu (Korean if the menu is Korean).',
    '- "nameEn": a short English name.',
    '- "priceWon": the price in won as a number, or null if no price is readable.',
    `- "contains": ingredients that are certainly in it, from this list only: ${INGREDIENTS.join(', ')}.`,
    '  Only when the name or the menu text makes it clear, e.g. 돼지국밥 -> pork, 계란말이 -> egg, 치즈돈까스 -> pork, dairy, wheat.',
    '- "mayContain": ingredients from the same list that are often in this dish in Korean cooking but are not named,',
    '  e.g. meat or anchovy broth (seafood), 맛술 / 미림 / 청주 in marinades and sauces (alcohol), soy sauce (soy, wheat),',
    '  batter and noodles (wheat), egg garnish, fish sauce in kimchi (seafood).',
    '  When you are unsure whether something is in a dish, put it in "mayContain". Leaving it out could hurt the user.',
    '- "seafood" covers fish, shellfish, shrimp, squid and anchovy. "dairy" covers milk, cheese, butter, cream.',
    '',
    'Rules:',
    '- Only list dishes you can actually read in the photo. Do not invent dishes or prices.',
    '- Skip section titles, opening hours and other text that is not a dish.',
    `- At most ${MAX_DISHES} items, in the order they appear on the menu.`,
    '- If the photo is not a menu, or nothing is readable, return no dishes and "notMenu": true.',
    '',
    'Reply with JSON only, in exactly this shape:',
    '{"notMenu": false, "dishes": [{"nameKo": "...", "nameEn": "...", "priceWon": 9000, "contains": ["pork"], "mayContain": ["soy", "wheat"]}]}',
  ].join('\n');
}

const USER_TEXT = 'Read this menu photo and list its dishes as described.';

async function askAi(
  provider: string,
  key: string,
  model: string,
  system: string,
  image: { data: string; mimeType: string },
): Promise<string> {
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      // Same settings as explain-dish, with more room: a full menu is a long answer,
      // and thinking also counts toward max_tokens.
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        output_config: { effort: 'low' },
        system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.data } },
              { type: 'text', text: USER_TEXT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic answered ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');
  }
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
              { type: 'text', text: USER_TEXT },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI answered ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: 'user',
              parts: [{ inlineData: { mimeType: image.mimeType, data: image.data } }, { text: USER_TEXT }],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini answered ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  }
  throw new Error(`Unknown AI_PROVIDER "${provider}" (use anthropic, openai or gemini)`);
}

type ScannedDish = {
  nameKo: string;
  nameEn: string;
  priceWon: number | null;
  contains: string[];
  mayContain: string[];
};

// Keeps only well-formed dishes with known ingredients. Anything else is dropped.
function readAnswer(raw: string): { notMenu: boolean; dishes: ScannedDish[] } | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const body = parsed as Record<string, unknown>;
  const list = Array.isArray(body.dishes) ? body.dishes : [];
  const dishes: ScannedDish[] = list
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map((d) => {
      const contains = pick(d.contains, INGREDIENTS);
      return {
        nameKo: text(d.nameKo),
        nameEn: text(d.nameEn),
        priceWon:
          typeof d.priceWon === 'number' && Number.isFinite(d.priceWon) && d.priceWon > 0
            ? Math.round(d.priceWon)
            : null,
        contains,
        // Something already in "contains" is not also "may contain".
        mayContain: pick(d.mayContain, INGREDIENTS).filter((i) => !contains.includes(i)),
      };
    })
    .filter((d) => d.nameKo !== '' || d.nameEn !== '')
    .slice(0, MAX_DISHES);
  return { notMenu: body.notMenu === true && dishes.length === 0, dishes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const provider = Deno.env.get('AI_PROVIDER') ?? '';
  const key = Deno.env.get('AI_API_KEY') ?? '';
  const model = Deno.env.get('AI_SCAN_MODEL') || Deno.env.get('AI_MODEL') || '';
  if (!provider || !key || !model) return json({ error: 'not_configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send JSON with image (base64) and mimeType' }, 400);
  }
  const data = typeof body.image === 'string' ? body.image : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
  if (!data || !IMAGE_TYPES.includes(mimeType)) return json({ error: 'bad_image' }, 400);
  if (data.length > MAX_BASE64_LENGTH) return json({ error: 'too_big' }, 413);

  try {
    const raw = await askAi(provider, key, model, systemPrompt(), { data, mimeType });
    const answer = readAnswer(raw);
    if (!answer) return json({ error: 'unreadable_answer' }, 502);
    return json({ ...answer, provider, model });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'ai_failed' }, 502);
  }
});

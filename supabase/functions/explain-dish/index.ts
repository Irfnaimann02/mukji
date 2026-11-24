// #10: explains why one dish is "Ask first" or "Avoid" for this user, and suggests
// Korean questions for the staff that fit this exact dish and situation.
// The AI key stays on the server, never in the app. Secrets:
//   AI_PROVIDER = anthropic | openai | gemini   (team choice: anthropic)
//   AI_API_KEY  = the key for that provider
//   AI_MODEL    = the model name, e.g. claude-haiku-5-5 (cheapest and fastest Claude model)
// The app only sends the dish facts it already shows. The prompt is built here,
// so this function cannot be used as a general chatbot. Sources are not written
// by the AI: the app shows the real data sources next to the answer.
// Returns { reason, questions: [{ ko, rom, en }] }.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INGREDIENTS = ['pork', 'beef', 'chicken', 'lamb', 'seafood', 'egg', 'dairy', 'alcohol', 'peanut', 'wheat', 'soy'];
const DIETS = ['halal', 'vegan', 'no_pork'];
const ALLERGENS = ['peanut', 'seafood', 'egg', 'dairy', 'wheat', 'soy'];
const STATUSES = ['safe', 'ask_first', 'avoid'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Keep only short text and known values, so the prompt stays small and predictable.
const text = (value: unknown, max = 80): string => (typeof value === 'string' ? value.slice(0, max) : '');
const pick = (value: unknown, allowed: string[]): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => allowed.includes(v)))] : [];
const texts = (value: unknown, maxItems = 10): string[] =>
  Array.isArray(value) ? value.slice(0, maxItems).map((v) => text(v)).filter(Boolean) : [];

type Facts = {
  language: 'en' | 'ko';
  status: string;
  // typical (#103): from a generated typical menu for this restaurant type, not its real menu
  dish: { nameKo: string; nameEn: string; contains: string[]; mayContain: string[]; typical: boolean };
  restaurant: {
    nameKo: string;
    nameEn: string;
    category: string; // licence type, e.g. 중국식, 호프/통닭
    foodType: string;
    halalCertified: boolean;
    origin: string[];
    sources: string[];
  };
  profile: { diets: string[]; allergens: string[] };
};

function readFacts(body: Record<string, unknown>): Facts | null {
  const dish = (body.dish ?? {}) as Record<string, unknown>;
  const restaurant = (body.restaurant ?? {}) as Record<string, unknown>;
  const profile = (body.profile ?? {}) as Record<string, unknown>;
  const status = text(body.status, 20);
  if (!STATUSES.includes(status) || !text(dish.nameKo)) return null;
  return {
    language: body.language === 'ko' ? 'ko' : 'en',
    status,
    dish: {
      nameKo: text(dish.nameKo),
      nameEn: text(dish.nameEn),
      contains: pick(dish.contains, INGREDIENTS),
      mayContain: pick(dish.mayContain, INGREDIENTS),
      typical: dish.typical === true,
    },
    restaurant: {
      nameKo: text(restaurant.nameKo),
      nameEn: text(restaurant.nameEn),
      category: text(restaurant.category, 40),
      foodType: text(restaurant.foodType, 20),
      halalCertified: restaurant.halalCertified === true,
      origin: texts(restaurant.origin),
      sources: texts(restaurant.sources),
    },
    profile: { diets: pick(profile.diets, DIETS), allergens: pick(profile.allergens, ALLERGENS) },
  };
}

function systemPrompt(language: 'en' | 'ko'): string {
  return [
    'You help a diner in Korea who has food restrictions (halal, vegan, no pork, allergies) decide about ONE dish in a restaurant app.',
    'The app has already labelled the dish "safe", "ask_first" or "avoid" from its data. Do not change the label.',
    '',
    'Facts you get: the dish name and its ingredients ("contains" = known to be in it, "mayContain" = might be, e.g. in the broth or sauce),',
    'the restaurant type, whether it is halal-certified, its 원산지 (origin) lines for this dish, and the user diets and allergies.',
    'If dish.typical is true, the dish comes from a GENERATED typical menu for this type of restaurant, not this restaurant\'s real menu:',
    'say that first, treat its ingredients as what such a dish usually has, and make the first question ask whether they serve it and what is in it.',
    '',
    'Write two things:',
    '1. "reason": say exactly what is uncertain or wrong for THIS dish and THIS user, and why it matters for their restriction.',
    '   Be specific to the dish and the restaurant type. For halal this usually means: whether the meat comes from halal slaughter;',
    '   whether pork, lard or pork broth is used; whether alcohol is in a sauce or marinade (맛술, 미림, 청주, 소주, wine);',
    '   whether frying oil or grills are shared with pork. For allergies: hidden sources (sauces, batter, broth, garnish).',
    '   You may use common knowledge about Korean cooking, but say it as a possibility ("often", "can"), never as a fact about this dish.',
    '   Only state as fact what is in the given data. 2 to 4 short sentences, speaking to the user as "you".',
    '   Write for a normal diner: never mention field names like "contains", "mayContain" or "data fields"; say "may contain" in plain words.',
    `   Write the reason in ${language === 'ko' ? 'Korean' : 'English'}.`,
    '2. "questions": 2 to 4 short, polite questions the user can show or read to the staff to clear up exactly these doubts.',
    '   Specific to this dish (name the dish or its parts), not generic. Do not ask about things the data already answers.',
    '   Each question: "ko" in natural polite Korean (해요체), "rom" = how to read it in romanised Korean, "en" = English meaning.',
    '',
    'Never say a dish is guaranteed safe or certainly halal: the data only covers what is written.',
    'Reply with JSON only, in exactly this shape:',
    '{"reason": "...", "questions": [{"ko": "...", "rom": "...", "en": "..."}]}',
  ].join('\n');
}

// Each AI call gives up after 25 s, so the app gets a clear 'ai_failed' instead of hanging.
const AI_TIMEOUT_MS = 25_000;
// When the provider is busy (Gemini 503, Claude 529) it usually clears in a second or two,
// so try again up to 2 more times before giving up. Other errors are not retried.
const RETRY_WAITS_MS = [1000, 2500];

async function postWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(AI_TIMEOUT_MS) });
    if ((res.status !== 503 && res.status !== 529) || attempt >= RETRY_WAITS_MS.length) return res;
    console.warn(`AI provider busy (${res.status}), retry ${attempt + 1}`);
    await res.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, RETRY_WAITS_MS[attempt]));
  }
}

async function askAi(provider: string, key: string, model: string, system: string, user: string): Promise<string> {
  if (provider === 'anthropic') {
    const res = await postWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      // Claude 5.5 models think before answering, and thinking counts toward max_tokens,
      // so leave room for it. Low effort is enough for a 2-3 sentence answer.
      // Do not send temperature, top_p or top_k: newer Claude models reject them.
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic answered ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // Only the text blocks are the answer; thinking blocks are skipped.
    return (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');
  }
  if (provider === 'openai') {
    const res = await postWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`OpenAI answered ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
  if (provider === 'gemini') {
    const res = await postWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          // Gemini 4 models think at "high" by default, which made a call run until the
          // function was stopped (150 s). "low" is plenty for this job.
          generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini answered ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  }
  throw new Error(`Unknown AI_PROVIDER "${provider}" (use anthropic, openai or gemini)`);
}

type Question = { ko: string; rom: string; en: string };

// The model is asked for {"reason": "...", "questions": [...]}.
// If it ignores that, the plain text becomes the reason and the app keeps its own questions.
function readAnswer(raw: string): { reason: string; questions: Question[] } {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    const parsed = JSON.parse(trimmed);
    const reason = typeof parsed?.reason === 'string' ? parsed.reason.trim() : '';
    const questions: Question[] = Array.isArray(parsed?.questions)
      ? parsed.questions
          .filter((q: unknown): q is Record<string, unknown> => typeof q === 'object' && q !== null)
          .map((q: Record<string, unknown>) => ({ ko: text(q.ko, 120), rom: text(q.rom, 160), en: text(q.en, 160) }))
          .filter((q: Question) => q.ko !== '')
          .slice(0, 4)
      : [];
    return { reason, questions }; // valid JSON without a reason counts as an empty answer
  } catch {
    // not JSON: use the plain text as the reason
    return { reason: trimmed, questions: [] };
  }
}

// 027: counts this call against the daily AI limits (30 per person, 1000 for
// the whole app). It runs with the caller's own login, so the database knows
// who is asking. Returns 'ok', or why not ('user_limit', 'app_limit', ...).
// If the check itself fails we do NOT call the AI: no limit, no spending.
async function useQuota(req: Request): Promise<string> {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const auth = req.headers.get('Authorization');
  if (!url || !anonKey || !auth) return 'login_required';
  try {
    const res = await fetch(`${url}/rest/v1/rpc/use_ai_quota`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ p_fn: 'explain-dish' }),
    });
    if (!res.ok) {
      console.error('use_ai_quota failed', res.status, await res.text());
      return 'quota_check_failed';
    }
    return String(await res.json());
  } catch (error) {
    console.error('use_ai_quota failed', error);
    return 'quota_check_failed';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const provider = Deno.env.get('AI_PROVIDER') ?? '';
  const key = Deno.env.get('AI_API_KEY') ?? '';
  const model = Deno.env.get('AI_MODEL') ?? '';
  // The app shows the data-based explanation when this happens.
  if (!provider || !key || !model) return json({ error: 'not_configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Send JSON with language, status, dish, restaurant and profile' }, 400);
  }
  const facts = readFacts(body);
  if (!facts) return json({ error: 'status and dish.nameKo are required' }, 400);

  // Only a valid request counts against the limit.
  const quota = await useQuota(req);
  if (quota === 'user_limit' || quota === 'app_limit') return json({ error: 'daily_limit' }, 429);
  if (quota === 'login_required') return json({ error: 'login_required' }, 401);
  if (quota !== 'ok') return json({ error: 'not_available' }, 503);

  try {
    const raw = await askAi(provider, key, model, systemPrompt(facts.language), JSON.stringify(facts));
    const { reason, questions } = readAnswer(raw);
    if (!reason) return json({ error: 'empty_answer' }, 502);
    return json({ reason: reason.slice(0, 1000), questions, provider, model });
  } catch (error) {
    // Week 12 "no error leakage": the provider's message stays in the function log.
    console.error('AI call failed', error);
    return json({ error: 'ai_failed' }, 502);
  }
});

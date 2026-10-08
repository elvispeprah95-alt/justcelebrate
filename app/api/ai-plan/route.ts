import { NextRequest, NextResponse } from 'next/server';

const SERVICES = [
  'venue',
  'music',
  'photography',
  'catering',
  'cake',
  'decor',
  'entertainment',
  'transport',
] as const;

type ServiceId = (typeof SERVICES)[number];

type VendorRecord = {
  id?: unknown;
  business_name?: unknown;
  category?: unknown;
  description?: unknown;
  town?: unknown;
  coverage_areas?: unknown;
  website?: unknown;
  is_featured?: unknown;
  services?: unknown;
};

type VendorMatch = {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  website: string;
  serviceId: ServiceId;
  local: boolean;
};

type PlannerInput = {
  description?: unknown;
  location?: unknown;
  date?: unknown;
  guests?: unknown;
  budget?: unknown;
  mode?: unknown;
  messages?: unknown;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const asText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

function readMessages(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((message) => {
      if (!message || typeof message !== 'object') return null;
      const item = message as Record<string, unknown>;
      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
      const content = asText(item.content, 1400);
      return role && content ? { role, content } : null;
    })
    .filter((message): message is ConversationMessage => Boolean(message))
    .slice(-8);
}

const asPositiveNumber = (value: unknown, maximum: number) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(Math.round(number), maximum) : null;
};

function toStringList(value: unknown, maximum: number, itemLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, itemLength))
    .filter(Boolean)
    .slice(0, maximum);
}

function serviceId(value: unknown): ServiceId | null {
  const label = asText(value, 80).toLowerCase();
  if (SERVICES.includes(label as ServiceId)) return label as ServiceId;
  if (/venue|location|space/.test(label)) return 'venue';
  if (/music|dj|band|singer/.test(label)) return 'music';
  if (/photo|video|film/.test(label)) return 'photography';
  if (/cater|food|drink/.test(label)) return 'catering';
  if (/cake|treat|dessert|sweet/.test(label)) return 'cake';
  if (/decor|balloon|flower|floral/.test(label)) return 'decor';
  if (/entertain|activity|host|performer|games/.test(label)) return 'entertainment';
  if (/transport|travel|car|coach/.test(label)) return 'transport';
  return null;
}

function parseModelJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstObject = cleaned.indexOf('{');
    const lastObject = cleaned.lastIndexOf('}');
    if (firstObject < 0 || lastObject <= firstObject) throw new Error('Invalid JSON response');
    return JSON.parse(cleaned.slice(firstObject, lastObject + 1));
  }
}

function normalisePlan(value: unknown, budget: number | null) {
  if (!value || typeof value !== 'object') return null;
  const plan = value as Record<string, unknown>;
  const rawServices = Array.isArray(plan.services) ? plan.services : [];
  const services = rawServices
    .map((service) => (service && typeof service === 'object' ? service as Record<string, unknown> : null))
    .filter((service): service is Record<string, unknown> => Boolean(service))
    .map((service) => ({
      id: serviceId(service.id ?? service.service ?? service.category),
      reason: asText(service.reason ?? service.why, 180),
      priority: asText(service.priority, 20).toLowerCase() === 'optional' ? 'optional' as const : 'essential' as const,
    }))
    .filter((service): service is { id: ServiceId; reason: string; priority: 'essential' | 'optional' } => Boolean(service.id))
    .filter((service, index, all) => all.findIndex((candidate) => candidate.id === service.id) === index)
    .slice(0, 8);

  if (services.length < 2) return null;

  const rawBudget = Array.isArray(plan.budget) ? plan.budget : [];
  let budgetItems = budget
    ? rawBudget
      .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : null))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({ label: asText(item.label, 40), amount: asPositiveNumber(item.amount, budget) }))
      .filter((item): item is { label: string; amount: number } => Boolean(item.label && item.amount))
      .slice(0, 5)
    : [];

  // A planning budget must remain true to the amount the customer gave us.
  if (budget && budgetItems.length) {
    const suppliedTotal = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    if (suppliedTotal > 0 && suppliedTotal !== budget) {
      let remaining = budget;
      budgetItems = budgetItems.map((item, index) => {
        const amount = index === budgetItems.length - 1
          ? remaining
          : Math.max(1, Math.round((item.amount / suppliedTotal) * budget));
        remaining -= amount;
        return { ...item, amount };
      });
    }
  }

  return {
    title: asText(plan.title, 90) || 'A celebration made for you',
    occasion: asText(plan.occasion, 50) || 'Celebration',
    theme: asText(plan.theme, 90) || 'A thoughtful celebration, made personal',
    summary: asText(plan.summary, 420) || 'A simple plan built around your celebration idea.',
    keyMoments: toStringList(plan.keyMoments, 4, 140),
    services,
    budget: budgetItems,
    budgetAdvice: asText(plan.budgetAdvice, 180),
    watchOuts: toStringList(plan.watchOuts, 3, 140),
    brief: (() => {
      const rawBrief = plan.brief && typeof plan.brief === 'object' ? plan.brief as Record<string, unknown> : {};
      return {
        location: asText(rawBrief.location, 150),
        guests: asPositiveNumber(rawBrief.guests, 999999),
        budget: asPositiveNumber(rawBrief.budget, 10000000),
        date: asText(rawBrief.date, 30),
      };
    })(),
  };
}


const VENDOR_SERVICE_TERMS: Record<ServiceId, string[]> = {
  venue: ['venue', 'marquee', 'hall', 'space'],
  music: ['dj', 'music', 'band', 'singer', 'live entertainment'],
  photography: ['photography', 'photographer', 'videography', 'videographer', 'content creator'],
  catering: ['catering', 'caterer', 'food', 'mobile bar', 'bar'],
  cake: ['cake', 'cakes', 'treat', 'dessert', 'sweet'],
  decor: ['decor', 'balloon', 'florist', 'flower', 'event equipment hire', 'event hire', 'party hire'],
  entertainment: ['entertainment', 'children', 'photo booth', 'performer', 'magician', 'activity'],
  transport: ['transport', 'car hire', 'coach'],
};

const normaliseSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function vendorText(vendor: VendorRecord) {
  return normaliseSearchText([
    asText(vendor.category, 100),
    asText(vendor.services, 600),
    asText(vendor.description, 1200),
  ].join(' '));
}

function servesRequestedLocation(vendor: VendorRecord, location: string) {
  const requested = normaliseSearchText(location);
  if (!requested) return false;
  const coverage = normaliseSearchText([
    asText(vendor.town, 150),
    asText(vendor.coverage_areas, 600),
  ].join(' '));
  if (coverage.includes(requested)) return true;
  const requestedWords = requested.split(' ').filter((word) => word.length > 3);
  return requestedWords.length > 0 && requestedWords.every((word) => coverage.includes(word));
}

function matchesService(vendor: VendorRecord, serviceId: ServiceId) {
  const text = vendorText(vendor);
  return VENDOR_SERVICE_TERMS[serviceId].some((term) => text.includes(normaliseSearchText(term)));
}

async function findVendorMatches(
  services: Array<{ id: ServiceId; priority: 'essential' | 'optional' }>,
  location: string,
): Promise<VendorMatch[]> {
  const configuredSupabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // Some environments expose the REST base while others expose the project base.
  const supabaseUrl = configuredSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return [];

  try {
    const params = new URLSearchParams({
      select: 'id,business_name,category,description,town,coverage_areas,website,is_featured,services',
      is_active: 'eq.true',
      order: 'is_featured.desc,business_name.asc',
      limit: '250',
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/vendors?${params.toString()}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('Vendor matching failed', {
        status: response.status,
        endpoint: new URL(response.url).pathname,
        details: (await response.text()).slice(0, 160),
      });
      return [];
    }

    const vendors = await response.json() as VendorRecord[];
    if (!Array.isArray(vendors)) return [];
    const uniqueServices = services
      .filter((service, index, all) => all.findIndex((candidate) => candidate.id === service.id) === index)
      .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'essential' ? -1 : 1))
      .slice(0, 5);
    const usedVendorIds = new Set<string>();
    const matches: VendorMatch[] = [];

    for (const service of uniqueServices) {
      const candidates = vendors
        .filter((vendor) => matchesService(vendor, service.id))
        .sort((a, b) => {
          const aLocal = servesRequestedLocation(a, location) ? 1 : 0;
          const bLocal = servesRequestedLocation(b, location) ? 1 : 0;
          if (aLocal !== bLocal) return bLocal - aLocal;
          const aFeatured = a.is_featured === true ? 1 : 0;
          const bFeatured = b.is_featured === true ? 1 : 0;
          return bFeatured - aFeatured;
        });

      for (const vendor of candidates) {
        const id = asText(vendor.id, 100);
        const name = asText(vendor.business_name, 120);
        if (!id || !name || usedVendorIds.has(id)) continue;
        usedVendorIds.add(id);
        matches.push({
          id,
          name,
          category: asText(vendor.category, 80) || 'Celebration supplier',
          location: asText(vendor.town, 100) || asText(vendor.coverage_areas, 160),
          description: asText(vendor.description, 220),
          website: asText(vendor.website, 300),
          serviceId: service.id,
          local: servesRequestedLocation(vendor, location),
        });
        break;
      }
      if (matches.length >= 5) break;
    }
    return matches;
  } catch (error) {
    console.error('Vendor matching could not be completed', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  let body: PlannerInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please tell us a little about your celebration.' }, { status: 400 });
  }

  const conversation = asText(body.mode, 30) === 'conversation';
  const messages = readMessages(body.messages);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  const description = asText(body.description, 2000) || latestUserMessage;
  if (description.length < (conversation ? 3 : 8)) {
    return NextResponse.json({ error: 'Please add a little more detail so we can make useful suggestions.' }, { status: 400 });
  }
  const location = asText(body.location, 150);
  const date = asText(body.date, 30);
  const guests = asPositiveNumber(body.guests, 999999);
  const budget = asPositiveNumber(body.budget, 10000000);
  const accessToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: 'The AI planner is not connected yet. Please try again shortly.' }, { status: 503 });
  }

  const conversationTranscript = messages
    .map((message) => `${message.role === 'assistant' ? 'Just Celebrate AI' : 'Customer'}: ${message.content}`)
    .join('\n');
  const customerMessageCount = messages.filter((message) => message.role === 'user').length;
  // A short discovery exchange makes supplier recommendations much more relevant.
  const mustCreatePlan = conversation && customerMessageCount >= 2;
  const prompt = conversation && !mustCreatePlan
    ? `You are Just Celebrate AI, a warm, practical UK celebration planner.
The customer is using a live conversation to shape their celebration.

Conversation so far:
${conversationTranscript || `Customer: ${description}`}

Helpful details: location ${location || 'not provided'}; date ${date || 'not provided'}; guests ${guests ?? 'not provided'}; budget in GBP ${budget ?? 'not provided'}.
Never ask for an exact address or postcode: a town or area is enough. This is the discovery reply, not the plan yet. Acknowledge their idea warmly, then ask the missing parts of this short planning check in one concise message: 1. What rough budget feels comfortable? 2. Which town or area should we look in? 3. Would they like help finding everything, or only certain suppliers (for example venue, food, décor, cake, entertainment, music or photography)? If they already gave any answer, do not repeat that question. Do not create a plan in this reply, even if enough detail is present — use the reply to confirm which suppliers they want help with. Set ready to false and plan to null.

Return concise JSON only:
{
  "reply": "A warm, helpful reply of no more than 70 words.",
  "ready": true,
  "plan": {
    "title": "short plan title",
    "occasion": "occasion type",
    "theme": "short style direction",
    "summary": "2 short sentences",
    "keyMoments": ["up to 4 concrete ideas"],
    "services": [{"id": "one permitted service id", "reason": "why it matters", "priority": "essential or optional"}],
    "budget": [{"label": "short category", "amount": 0}],
    "budgetAdvice": "short helpful budget advice if no budget was supplied",
    "watchOuts": ["up to 3 practical things the customer may otherwise miss"],
    "brief": {"location": "town or area if mentioned", "guests": 0, "budget": 0, "date": "YYYY-MM-DD only if clearly given"}
  }
}

Use the conversation to extract details the customer mentions into brief. Never invent an exact address, date, guest count or budget; leave missing values blank or 0.

When ready, label the core services as "essential" and upgrades as "optional". Include only genuinely useful services. Keep watchOuts practical, specific and reassuring.

For this discovery reply, always set "ready" to false and "plan" to null. Keep the reply under 90 words and make the questions easy to answer in one message.`
    : `Create a warm, practical plan for this UK celebration.

Celebration idea and discovery answers: ${conversation ? messages.filter((message) => message.role === 'user').map((message) => message.content).join(' ') : description}
Location: ${location || 'Not provided'}
Date: ${date || 'Not provided'}
Guests: ${guests ?? 'Not provided'}
Budget in GBP: ${budget ?? 'Not provided'}

The customer has now completed the quick planning check. Use their budget, area and supplier preferences to think ahead for them: recommend only the services they asked for or genuinely need, explain why, and make the supplier suggestions practical. A service will appear as a link to real Just Celebrate suppliers in their planning portal.
Recommend only services from this exact list: ${SERVICES.join(', ')}.
Return a concise JSON object only, with this shape:
{
  "title": "short plan title",
  "occasion": "occasion type",
  "theme": "short style direction",
  "summary": "2 short sentences explaining the plan",
  "keyMoments": ["up to 4 concrete ideas"],
  "services": [{"id": "one permitted service id", "reason": "why it matters for this celebration", "priority": "essential or optional"}],
  "budget": [{"label": "short category", "amount": 0}],
  "budgetAdvice": "short helpful budget advice if no budget was supplied",
  "watchOuts": ["up to 3 practical things the customer may otherwise miss"],
  "brief": {"location": "town or area if mentioned", "guests": 0, "budget": 0, "date": "YYYY-MM-DD only if clearly given"}
}

Use the celebration idea to extract details mentioned into brief. Never invent exact details; leave missing values blank or 0.

Label core services as "essential" and upgrades as "optional". Include practical watchOuts that help the customer avoid last-minute stress.

Choose 3 to 7 services, including only what is genuinely useful. Treat the budget as a rough planning guide, never a quote. If a budget is given, include up to 5 budget items that add up approximately to it; otherwise return an empty budget list.`;

  try {
    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_GATEWAY_MODEL || 'zai/glm-4.7-flash',
        messages: [
          { role: 'system', content: 'You are the concise, imaginative planning assistant for Just Celebrate.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.55,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      console.error('AI Gateway request failed', { status: response.status, details });
      return NextResponse.json({ error: 'We could not make your plan just now. Please try again.' }, { status: 502 });
    }

    const completion = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Missing model response');
    const modelValue = parseModelJson(content);

    if (conversation && !mustCreatePlan) {
      const modelReply = modelValue && typeof modelValue === 'object'
        ? asText((modelValue as Record<string, unknown>).reply, 700)
        : '';
      const reply = modelReply || 'Lovely idea. To tailor the plan and the right suppliers, what budget feels comfortable, which area should we look in, and would you like help with everything or only certain suppliers?';
      return NextResponse.json({ reply, ready: false });
    }

    const plan = normalisePlan(modelValue, budget);
    if (!plan) throw new Error('Invalid model response');

    const vendorMatches = await findVendorMatches(plan.services, plan.brief.location || location);
    const planWithMatches = { ...plan, vendorMatches };
    return NextResponse.json(conversation ? { reply: 'I’ve put together a celebration plan around everything you shared.', ready: true, plan: planWithMatches } : { plan: planWithMatches });
  } catch (error) {
    console.error('AI planner response could not be processed', error);
    return NextResponse.json({ error: 'We could not make your plan just now. Please try again.' }, { status: 502 });
  }
}

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
    }))
    .filter((service): service is { id: ServiceId; reason: string } => Boolean(service.id))
    .filter((service, index, all) => all.findIndex((candidate) => candidate.id === service.id) === index)
    .slice(0, 8);

  if (services.length < 2) return null;

  const rawBudget = Array.isArray(plan.budget) ? plan.budget : [];
  const budgetItems = budget
    ? rawBudget
      .map((item) => (item && typeof item === 'object' ? item as Record<string, unknown> : null))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({ label: asText(item.label, 40), amount: asPositiveNumber(item.amount, budget) }))
      .filter((item): item is { label: string; amount: number } => Boolean(item.label && item.amount))
      .slice(0, 5)
    : [];

  return {
    title: asText(plan.title, 90) || 'A celebration made for you',
    occasion: asText(plan.occasion, 50) || 'Celebration',
    theme: asText(plan.theme, 90) || 'A thoughtful celebration, made personal',
    summary: asText(plan.summary, 420) || 'A simple plan built around your celebration idea.',
    keyMoments: toStringList(plan.keyMoments, 4, 140),
    services,
    budget: budgetItems,
  };
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
  const followUpCount = messages.filter((message) => message.role === 'assistant').length;
  const mustCreatePlan = conversation && followUpCount >= 1;
  const prompt = conversation && !mustCreatePlan
    ? `You are Just Celebrate AI, a warm, practical UK celebration planner.
The customer is using a live conversation to shape their celebration.

Conversation so far:
${conversationTranscript || `Customer: ${description}`}

Helpful details: location ${location || 'not provided'}; date ${date || 'not provided'}; guests ${guests ?? 'not provided'}; budget in GBP ${budget ?? 'not provided'}.
Never ask for an exact address or postcode: a town or area is enough. Location, date, guest count and budget are optional refinements, not reasons to delay a useful plan. If the customer has shared an occasion and a rough feel, theme or priority, make their full plan immediately. You may ask at most one short clarifying question, and only if their first message is too vague to understand the celebration. If ${followUpCount} is 1 or more, you MUST set ready to true and include a complete plan now. Do not ask any further questions.

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
    "services": [{"id": "one permitted service id", "reason": "why it matters"}],
    "budget": [{"label": "short category", "amount": 0}]
  }
}

If one useful question is still needed, set "ready" to false and set "plan" to null. If ready is true, recommend only these service ids: ${SERVICES.join(', ')}. Choose 3 to 7 services that are genuinely useful. Budget figures are rough planning guides, never quotes.`
    : `Create a warm, practical plan for this UK celebration.

Celebration idea: ${conversation ? messages.filter((message) => message.role === 'user').map((message) => message.content).join(' ') : description}
Location: ${location || 'Not provided'}
Date: ${date || 'Not provided'}
Guests: ${guests ?? 'Not provided'}
Budget in GBP: ${budget ?? 'Not provided'}

Recommend only services from this exact list: ${SERVICES.join(', ')}.
Return a concise JSON object only, with this shape:
{
  "title": "short plan title",
  "occasion": "occasion type",
  "theme": "short style direction",
  "summary": "2 short sentences explaining the plan",
  "keyMoments": ["up to 4 concrete ideas"],
  "services": [{"id": "one permitted service id", "reason": "why it matters for this celebration"}],
  "budget": [{"label": "short category", "amount": 0}]
}

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
      const planValue = modelValue && typeof modelValue === 'object'
        ? (modelValue as Record<string, unknown>).plan
        : null;
      const plan = normalisePlan(planValue, budget);
      const reply = modelReply || (plan ? 'I’ve shaped a celebration plan around your idea.' : 'Tell me one more little detail and I’ll make this feel more like you.');
      return NextResponse.json(plan ? { reply, ready: true, plan } : { reply, ready: false });
    }

    const plan = normalisePlan(modelValue, budget);
    if (!plan) throw new Error('Invalid model response');

    return NextResponse.json(conversation ? { reply: 'I’ve put together a celebration plan around everything you shared.', ready: true, plan } : { plan });
  } catch (error) {
    console.error('AI planner response could not be processed', error);
    return NextResponse.json({ error: 'We could not make your plan just now. Please try again.' }, { status: 502 });
  }
}

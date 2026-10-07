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
};

const asText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

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

function normalisePlan(value: unknown, budget: number | null) {
  if (!value || typeof value !== 'object') return null;
  const plan = value as Record<string, unknown>;
  const rawServices = Array.isArray(plan.services) ? plan.services : [];
  const services = rawServices
    .map((service) => (service && typeof service === 'object' ? service as Record<string, unknown> : null))
    .filter((service): service is Record<string, unknown> => Boolean(service))
    .map((service) => ({
      id: SERVICES.includes(service.id as ServiceId) ? service.id as ServiceId : null,
      reason: asText(service.reason, 180),
    }))
    .filter((service): service is { id: ServiceId; reason: string } => Boolean(service.id && service.reason))
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

  const description = asText(body.description, 2000);
  if (description.length < 8) {
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

  const prompt = `Create a warm, practical plan for this UK celebration.

Celebration idea: ${description}
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
      return NextResponse.json({ error: 'We could not make your plan just now. Please try again.' }, { status: 502 });
    }

    const completion = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Missing model response');
    const plan = normalisePlan(JSON.parse(content), budget);
    if (!plan) throw new Error('Invalid model response');

    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: 'We could not make your plan just now. Please try again.' }, { status: 502 });
  }
}

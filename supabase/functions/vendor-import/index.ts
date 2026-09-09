import { withSupabase } from 'npm:@supabase/server@1.5.3'

type VendorInput = {
  external_id: string
  business_name: string
  slug?: string | null
  category?: string | null
  description?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  instagram?: string | null
  town?: string | null
  postcode?: string | null
  coverage_areas?: string | null
  services?: string | null
  source_name?: string | null
  source_url?: string | null
  is_active?: boolean
  is_featured?: boolean
}

const cleanText = (value: unknown, max = 5000): string | null => {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  return cleaned ? cleaned.slice(0, max) : null
}

const makeSlug = (name: string, externalId: string) => {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'vendor'

  const suffix = externalId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-20) || crypto.randomUUID().slice(0, 8)

  return `${base}-${suffix}`.slice(0, 95)
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const userId = (ctx.userClaims as { sub?: string; id?: string } | undefined)?.sub ??
      (ctx.userClaims as { sub?: string; id?: string } | undefined)?.id

    if (!userId) {
      return Response.json({ error: 'Unable to identify signed-in user' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await ctx.supabaseAdmin
      .from('profiles')
      .select('account_type, account_status')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      return Response.json({ error: 'Unable to verify admin access' }, { status: 500 })
    }

    if (profile?.account_type !== 'admin' || profile?.account_status !== 'active') {
      return Response.json({ error: 'Admin access required' }, { status: 403 })
    }

    let body: { vendors?: VendorInput[] }
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!Array.isArray(body.vendors) || body.vendors.length === 0) {
      return Response.json({ error: 'Provide a non-empty vendors array' }, { status: 400 })
    }

    if (body.vendors.length > 250) {
      return Response.json({ error: 'Maximum 250 vendors per import request' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const rows = []

    for (const vendor of body.vendors) {
      const externalId = cleanText(vendor?.external_id, 300)
      const businessName = cleanText(vendor?.business_name, 300)

      if (!externalId || !businessName) {
        return Response.json(
          { error: 'Every vendor requires external_id and business_name' },
          { status: 400 },
        )
      }

      rows.push({
        external_id: externalId,
        business_name: businessName,
        slug: cleanText(vendor.slug, 120) ?? makeSlug(businessName, externalId),
        category: cleanText(vendor.category, 200),
        description: cleanText(vendor.description, 5000),
        phone: cleanText(vendor.phone, 100),
        email: cleanText(vendor.email, 320),
        website: cleanText(vendor.website, 1000),
        instagram: cleanText(vendor.instagram, 1000),
        town: cleanText(vendor.town, 200),
        postcode: cleanText(vendor.postcode, 30),
        coverage_areas: cleanText(vendor.coverage_areas, 2000),
        services: cleanText(vendor.services, 3000),
        source_name: cleanText(vendor.source_name, 200),
        source_url: cleanText(vendor.source_url, 1500),
        listing_status: 'unclaimed',
        is_active: vendor.is_active !== false,
        is_featured: vendor.is_featured === true,
        imported_at: now,
        last_verified_at: now,
        updated_at: now,
      })
    }

    const { data, error } = await ctx.supabaseAdmin
      .from('vendors')
      .upsert(rows, { onConflict: 'external_id' })
      .select('id, external_id, business_name, slug')

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      ok: true,
      imported: data?.length ?? 0,
      vendors: data ?? [],
    })
  }),
}

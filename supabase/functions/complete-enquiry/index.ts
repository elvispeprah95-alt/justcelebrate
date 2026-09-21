import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.justcelebrate.co.uk",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return response({ error: "Please confirm your email first." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Service configuration is unavailable." }, 500);

  const db = createClient(url, serviceKey);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await db.auth.getUser(token);
  const user = authData.user;
  if (authError || !user?.email) return response({ error: "Please confirm your email first." }, 401);
  const now = new Date().toISOString();
  await db.from("pending_enquiry_drafts").delete().lt("expires_at", now);

  const customerEmail = user.email.trim().toLowerCase();
  const { data: draft, error: draftError } = await db
    .from("pending_enquiry_drafts")
    .select("token,payload")
    .eq("customer_email", customerEmail)
    .is("claimed_by", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (draftError) return response({ error: "We couldn't find your pending enquiry." }, 500);
  if (!draft) return response({ status: "empty" });

  const { data: claimed, error: claimError } = await db
    .from("pending_enquiry_drafts")
    .update({ claimed_by: user.id, claimed_at: now })
    .eq("token", draft.token)
    .is("claimed_by", null)
    .select("token,payload")
    .maybeSingle();

  if (claimError) return response({ error: "We couldn't secure your enquiry. Please start again." }, 500);
  if (!claimed) return response({ status: "already_processed" });

  const drafts = Array.isArray(claimed.payload?.drafts) ? claimed.payload.drafts : [];
  if (drafts.length < 1 || drafts.length > 5) return response({ error: "This enquiry is no longer valid." }, 422);

  const entries = drafts.map((item) => ({
    vendorId: cleanText(item?.vendorId, 180),
    vendorName: cleanText(item?.vendorName, 160),
    vendorEmail: cleanText(item?.vendorEmail, 254).toLowerCase(),
    customerName: cleanText(item?.customerName, 100),
    customerEmail: cleanText(item?.customerEmail, 254).toLowerCase(),
    subject: cleanText(item?.subject, 160),
    eventDate: cleanText(item?.eventDate, 10),
    eventLocation: cleanText(item?.eventLocation, 200),
    message: cleanText(item?.message, 5000),
  }));

  if (entries.some((item) =>
    !item.vendorId ||
    !item.vendorName ||
    !item.vendorEmail.includes("@") ||
    !item.customerName ||
    item.customerEmail !== customerEmail ||
    !item.subject ||
    !item.message
  )) return response({ error: "This enquiry is no longer valid." }, 422);

  const conversationIds: string[] = [];
  for (const item of entries) {
    const { data: conversation, error: conversationError } = await db
      .from("conversations")
      .insert({
        customer_id: user.id,
        vendor_external_id: item.vendorId,
        vendor_name: item.vendorName,
        vendor_email: item.vendorEmail,
        subject: item.subject,
        event_date: item.eventDate || null,
        event_location: item.eventLocation || null,
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      return response({ error: conversationIds.length ? "Some enquiries were sent, but the rest need attention in your inbox." : "We couldn't create your enquiry. Please start again." }, 500);
    }

    const { error: messageError } = await db.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      sender_type: "customer",
      body: item.message,
    });

    if (messageError) return response({ error: "Your conversation was created, but the message needs attention in your inbox." }, 500);
    conversationIds.push(conversation.id);
  }

  await db.from("pending_enquiry_drafts").delete().eq("token", claimed.token);
  return response({ status: "sent", count: conversationIds.length, conversations: conversationIds });
});
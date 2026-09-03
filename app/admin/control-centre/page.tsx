"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../supabase";

type Tab = "analytics" | "claims" | "enquiries" | "users" | "reviews" | "notifications" | "activity" | "settings";
type Profile = { id: string; display_name: string; email: string | null; account_type: string; account_status: string; created_at: string };
type Conversation = { id: string; customer_id: string; vendor_name: string | null; vendor_email: string | null; subject: string; status: string; last_message_at: string; created_at: string };
type Claim = { id: string; vendor_name: string; claimant_email: string; evidence: string; status: string; review_note: string; created_at: string };
type Review = { id: string; vendor_name: string; rating: number; body: string; report_reason: string; status: string; created_at: string };
type Activity = { id: string; action: string; entity_type: string; entity_id: string; details: Record<string, unknown>; created_at: string };
type Settings = { homepage: { announcement: string; show_announcement: boolean }; notifications: { reply_reminder_hours: number; email_admin_for_claims: boolean; email_admin_for_reviews: boolean }; marketplace: { claims_enabled: boolean; reviews_enabled: boolean; featured_vendor_limit: number } };

const defaultSettings: Settings = {
  homepage: { announcement: "", show_announcement: false },
  notifications: { reply_reminder_hours: 24, email_admin_for_claims: true, email_admin_for_reviews: true },
  marketplace: { claims_enabled: true, reviews_enabled: true, featured_vendor_limit: 8 },
};

const tabs: { id: Tab; label: string }[] = [
  { id: "analytics", label: "Analytics" }, { id: "claims", label: "Claims" },
  { id: "enquiries", label: "Enquiries" }, { id: "users", label: "Users" },
  { id: "reviews", label: "Reviews" }, { id: "notifications", label: "Notifications" },
  { id: "activity", label: "Activity" }, { id: "settings", label: "Settings" },
];

export default function AdminControlCentre() {
  const [tab, setTab] = useState<Tab>("analytics");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [adminId, setAdminId] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loadedAt, setLoadedAt] = useState(0);

  async function reload() {
    setLoading(true);
    const { data: refreshed } = await supabase.auth.refreshSession();
    const user = refreshed.session?.user;
    if (!user || user.app_metadata?.account_type !== "admin") {
      setNotice("Your admin session has expired. Return to the admin page and sign in again.");
      setLoading(false);
      return;
    }
    setAdminId(user.id);
    const [p, c, m, cl, r, a, s] = await Promise.all([
      supabase.from("profiles").select("id,display_name,email,account_type,account_status,created_at").order("created_at", { ascending: false }),
      supabase.from("conversations").select("id,customer_id,vendor_name,vendor_email,subject,status,last_message_at,created_at").order("last_message_at", { ascending: false }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("vendor_claims").select("id,vendor_name,claimant_email,evidence,status,review_note,created_at").order("created_at", { ascending: false }),
      supabase.from("reviews").select("id,vendor_name,rating,body,report_reason,status,created_at").order("created_at", { ascending: false }),
      supabase.from("admin_activity").select("id,action,entity_type,entity_id,details,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("marketplace_settings").select("key,value"),
    ]);
    const failed = [p, c, m, cl, r, a, s].some((result) => result.error);
    if (failed) setNotice("Some information could not be loaded. Refresh and try again.");
    setProfiles((p.data || []) as Profile[]); setConversations((c.data || []) as Conversation[]);
    setMessageCount(m.count || 0); setClaims((cl.data || []) as Claim[]); setReviews((r.data || []) as Review[]); setActivity((a.data || []) as Activity[]);
    const loaded = { ...defaultSettings };
    for (const row of s.data || []) if (row.key in loaded) Object.assign(loaded[row.key as keyof Settings], row.value);
    setSettings(loaded); setLoadedAt(Date.now()); setLoading(false);
  }

  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, []);

  async function log(action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) {
    await supabase.from("admin_activity").insert({ admin_id: adminId, action, entity_type: entityType, entity_id: entityId, details });
  }

  async function updateClaim(id: string, status: "approved" | "rejected") {
    const claim = claims.find((item) => item.id === id); if (!claim) return;
    const { error } = await supabase.from("vendor_claims").update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return setNotice("The claim could not be updated.");
    await log(`${status} vendor claim`, "vendor_claim", id, { vendor_name: claim.vendor_name });
    setClaims((items) => items.map((item) => item.id === id ? { ...item, status } : item)); setNotice(`Claim ${status}.`);
  }

  async function updateReview(id: string, status: "approved" | "rejected") {
    const review = reviews.find((item) => item.id === id); if (!review) return;
    const { error } = await supabase.from("reviews").update({ status, moderated_by: adminId, moderated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setNotice("The review could not be updated.");
    await log(`${status} review`, "review", id, { vendor_name: review.vendor_name });
    setReviews((items) => items.map((item) => item.id === id ? { ...item, status } : item)); setNotice(`Review ${status}.`);
  }

  async function updateConversation(id: string, status: string) {
    const { error } = await supabase.from("conversations").update({ status }).eq("id", id);
    if (error) return setNotice("The enquiry could not be updated.");
    await log("changed enquiry status", "conversation", id, { status });
    setConversations((items) => items.map((item) => item.id === id ? { ...item, status } : item)); setNotice("Enquiry status updated.");
  }

  async function updateUser(id: string, changes: Partial<Pick<Profile, "account_type" | "account_status">>) {
    const profile = profiles.find((item) => item.id === id); if (!profile || profile.account_type === "admin") return;
    const { error } = await supabase.from("profiles").update(changes).eq("id", id);
    if (error) return setNotice("The account could not be updated.");
    await log("updated user account", "profile", id, changes);
    setProfiles((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item)); setNotice("Account updated.");
  }

  async function saveSettings() {
    const now = new Date().toISOString();
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value, updated_at: now, updated_by: adminId }));
    const { error } = await supabase.from("marketplace_settings").upsert(rows);
    if (error) return setNotice("Settings could not be saved.");
    await log("updated marketplace settings", "settings", "marketplace"); setNotice("Marketplace settings saved.");
  }

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const pendingClaims = claims.filter((item) => item.status === "pending");
  const pendingReviews = reviews.filter((item) => item.status === "pending");
  const reminderMs = settings.notifications.reply_reminder_hours * 3_600_000;
  const oldOpenEnquiries = conversations.filter((item) => item.status === "open" && loadedAt - new Date(item.last_message_at).getTime() > reminderMs);
  const conversionCount = conversations.filter((item) => item.status === "booked").length;

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] text-[#0d3835]">Loading control centre…</main>;

  return <main className="min-h-screen bg-[#f7f3ea] px-4 py-7 text-[#0d3835] sm:px-6">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-3xl bg-[#0d3835] p-7 text-white sm:flex sm:items-center sm:justify-between">
        <div><p className="text-sm font-bold text-[#ffaaa5]">JUST CELEBRATE ADMIN</p><h1 className="mt-2 text-3xl font-semibold">Control centre</h1></div>
        <div className="mt-4 flex gap-3 sm:mt-0"><Link href="/admin/vendors" className="rounded-xl bg-[#ff655d] px-4 py-2 text-sm font-bold">Vendors</Link><Link href="/admin" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold">Overview</Link></div>
      </header>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${tab === item.id ? "bg-[#0d3835] text-white" : "bg-white"}`}>{item.label}{item.id === "notifications" && (pendingClaims.length + pendingReviews.length + oldOpenEnquiries.length) > 0 ? ` (${pendingClaims.length + pendingReviews.length + oldOpenEnquiries.length})` : ""}</button>)}</nav>
      {notice && <p className="mt-3 rounded-2xl bg-[#fff4d6] p-4 text-sm">{notice}</p>}

      {tab === "analytics" && <section className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Registered users", profiles.length], ["Total enquiries", conversations.length], ["Messages", messageCount], ["Confirmed bookings", conversionCount]].map(([label, value]) => <article key={label} className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-[#65706e]">{label}</p><p className="mt-2 text-4xl font-semibold">{value}</p></article>)}</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><Panel title="Enquiry pipeline">{["open", "quoted", "booked", "closed"].map((status) => <Metric key={status} label={status} value={conversations.filter((item) => item.status === status).length} />)}</Panel><Panel title="Marketplace health"><Metric label="Active accounts" value={profiles.filter((item) => item.account_status === "active").length} /><Metric label="Vendors registered" value={profiles.filter((item) => item.account_type === "vendor").length} /><Metric label="Pending claims" value={pendingClaims.length} /><Metric label="Pending reviews" value={pendingReviews.length} /></Panel></div>
      </section>}

      {tab === "claims" && <ListPanel title="Vendor claim approvals" empty="No vendor claims are waiting for review.">{claims.map((claim) => <AdminRow key={claim.id} title={claim.vendor_name} meta={`${claim.claimant_email} · ${new Date(claim.created_at).toLocaleDateString()}`} badge={claim.status}><p className="mt-2 text-sm text-[#65706e]">{claim.evidence || "No supporting notes supplied."}</p>{claim.status === "pending" && <Actions onApprove={() => void updateClaim(claim.id, "approved")} onReject={() => void updateClaim(claim.id, "rejected")} />}</AdminRow>)}</ListPanel>}

      {tab === "enquiries" && <ListPanel title="Enquiry management" empty="No enquiries have been sent yet.">{conversations.map((item) => <AdminRow key={item.id} title={item.vendor_name || "Vendor enquiry"} meta={`${profileMap.get(item.customer_id)?.email || "Customer"} · ${item.subject}`} badge={item.status}><label className="mt-3 block text-sm font-bold">Status <select value={item.status} onChange={(event) => void updateConversation(item.id, event.target.value)} className="ml-2 rounded-xl border border-[#d9d5cc] bg-white px-3 py-2 font-normal"><option>open</option><option>quoted</option><option>booked</option><option>closed</option></select></label></AdminRow>)}</ListPanel>}

      {tab === "users" && <ListPanel title="User management" empty="No accounts found.">{profiles.map((profile) => <AdminRow key={profile.id} title={profile.display_name || "Unnamed account"} meta={profile.email || "No email"} badge={profile.account_status}>{profile.account_type === "admin" ? <p className="mt-2 text-sm text-[#65706e]">Protected administrator account</p> : <div className="mt-3 flex flex-wrap gap-3"><label className="text-sm font-bold">Role <select value={profile.account_type} onChange={(event) => void updateUser(profile.id, { account_type: event.target.value })} className="ml-2 rounded-xl border border-[#d9d5cc] px-3 py-2 font-normal"><option value="customer">Customer</option><option value="vendor">Vendor</option></select></label><button onClick={() => void updateUser(profile.id, { account_status: profile.account_status === "active" ? "suspended" : "active" })} className="rounded-xl bg-[#0d3835] px-4 py-2 text-sm font-bold text-white">{profile.account_status === "active" ? "Suspend" : "Reactivate"}</button></div>}</AdminRow>)}</ListPanel>}

      {tab === "reviews" && <ListPanel title="Review moderation" empty="No reviews have been submitted.">{reviews.map((review) => <AdminRow key={review.id} title={`${review.vendor_name} · ${"★".repeat(review.rating)}`} meta={new Date(review.created_at).toLocaleDateString()} badge={review.status}><p className="mt-2 text-sm text-[#65706e]">{review.body}</p>{review.report_reason && <p className="mt-2 text-sm font-bold text-red-700">Reported: {review.report_reason}</p>}{review.status === "pending" && <Actions onApprove={() => void updateReview(review.id, "approved")} onReject={() => void updateReview(review.id, "rejected")} />}</AdminRow>)}</ListPanel>}

      {tab === "notifications" && <ListPanel title="Action needed" empty="You are all caught up.">{pendingClaims.map((item) => <NoticeRow key={item.id} title="Vendor claim awaiting approval" text={item.vendor_name} onClick={() => setTab("claims")} />)}{pendingReviews.map((item) => <NoticeRow key={item.id} title="Review awaiting moderation" text={item.vendor_name} onClick={() => setTab("reviews")} />)}{oldOpenEnquiries.map((item) => <NoticeRow key={item.id} title="Enquiry may need a reply" text={item.vendor_name || item.subject} onClick={() => setTab("enquiries")} />)}</ListPanel>}

      {tab === "activity" && <ListPanel title="Admin activity history" empty="No admin changes have been recorded yet.">{activity.map((item) => <AdminRow key={item.id} title={item.action} meta={`${item.entity_type} · ${new Date(item.created_at).toLocaleString()}`} badge="recorded" />)}</ListPanel>}

      {tab === "settings" && <section className="mt-5 grid gap-5 lg:grid-cols-2"><Panel title="Marketplace"><Toggle label="Allow vendor claims" checked={settings.marketplace.claims_enabled} onChange={(value) => setSettings({ ...settings, marketplace: { ...settings.marketplace, claims_enabled: value } })} /><Toggle label="Allow customer reviews" checked={settings.marketplace.reviews_enabled} onChange={(value) => setSettings({ ...settings, marketplace: { ...settings.marketplace, reviews_enabled: value } })} /><NumberField label="Featured vendor limit" value={settings.marketplace.featured_vendor_limit} onChange={(value) => setSettings({ ...settings, marketplace: { ...settings.marketplace, featured_vendor_limit: value } })} /></Panel><Panel title="Alerts and homepage"><Toggle label="Show homepage announcement" checked={settings.homepage.show_announcement} onChange={(value) => setSettings({ ...settings, homepage: { ...settings.homepage, show_announcement: value } })} /><label className="block text-sm font-bold">Announcement<textarea value={settings.homepage.announcement} onChange={(event) => setSettings({ ...settings, homepage: { ...settings.homepage, announcement: event.target.value } })} rows={3} className="mt-2 w-full rounded-xl border border-[#d9d5cc] p-3 font-normal" /></label><NumberField label="Enquiry reminder (hours)" value={settings.notifications.reply_reminder_hours} onChange={(value) => setSettings({ ...settings, notifications: { ...settings.notifications, reply_reminder_hours: value } })} /></Panel><button onClick={() => void saveSettings()} className="rounded-xl bg-[#ff655d] px-5 py-3 font-bold text-white lg:col-span-2">Save all settings</button></section>}
    </div>
  </main>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{title}</h2><div className="mt-5 space-y-4">{children}</div></section>; }
function ListPanel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const hasChildren = Array.isArray(children) ? children.length > 0 : !!children; return <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{title}</h2><div className="mt-5 space-y-3">{hasChildren ? children : <p className="text-sm text-[#65706e]">{empty}</p>}</div></section>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between rounded-2xl bg-[#f7f3ea] p-4"><span className="capitalize">{label}</span><strong className="text-xl">{value}</strong></div>; }
function AdminRow({ title, meta, badge, children }: { title: string; meta: string; badge: string; children?: React.ReactNode }) { return <article className="rounded-2xl bg-[#f7f3ea] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-[#65706e]">{meta}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs capitalize">{badge}</span></div>{children}</article>; }
function Actions({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) { return <div className="mt-3 flex gap-2"><button onClick={onApprove} className="rounded-xl bg-[#0d3835] px-4 py-2 text-sm font-bold text-white">Approve</button><button onClick={onReject} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Reject</button></div>; }
function NoticeRow({ title, text, onClick }: { title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center justify-between rounded-2xl bg-[#fff4d6] p-4 text-left"><span><strong>{title}</strong><span className="mt-1 block text-sm text-[#65706e]">{text}</span></span><span>View →</span></button>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f3ea] p-4 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-sm font-bold">{label}<input type="number" min="1" value={value} onChange={(event) => onChange(Number(event.target.value) || 1)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] p-3 font-normal" /></label>; }

"use client";
import React, { useEffect, useState } from "react";
import { PageHead, Card, Field, Loading } from "@/admin/lib";
import { getSeoSettings, saveSeoSettings, logActivity } from "@/lib/firestore-service";
import { useAdminAuth } from "@/lib/firebase-auth";
import { ImageUploader } from "@/admin/image-uploader";

const DEFAULTS = {
  siteTitle: "Granth Laptop Hub Jodhpur — Refurbished & New Laptops",
  metaDescription: "Jodhpur's trusted laptop store — certified refurbished & new laptops with warranty assistance, EMI & COD.",
  keywords: "laptops jodhpur, refurbished laptops, granth laptop hub",
  ogImage: "",
  pages: {
    home: { title: "", desc: "" },
    shop: { title: "", desc: "" },
    about: { title: "", desc: "" },
    contact: { title: "", desc: "" },
    compare: { title: "", desc: "" },
  },
};

export default function SeoPage() {
  const { user } = useAdminAuth();
  const [v, setV] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSeoSettings()
      .then((d) => setV({ ...DEFAULTS, ...(d || {}), pages: { ...DEFAULTS.pages, ...(d?.pages || {}) } }))
      .catch(() => setV({ ...DEFAULTS }))
      .finally(() => setLoading(false));
  }, []);

  const page = (k: string) => (v.pages ?? {})[k] ?? { title: "", desc: "" };
  const setPage = (k: string, patch: any) => setV({ ...v, pages: { ...v.pages, [k]: { ...page(k), ...patch } } });

  async function save() {
    if (!v) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await saveSeoSettings(v);
      logActivity({
        adminId: user?.uid,
        adminName: user?.email ?? "admin",
        action: "update",
        entity: "siteSettings",
        entityId: "seo",
        summary: "SEO settings updated",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message || "Save failed — check Firestore rules.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !v) return <Loading />;

  return (
    <div>
      <PageHead title="SEO" desc="Saved to Firestore /siteSettings/seo — read by the customer website. Product & blog SEO live in their editors." />
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">✓ Saved to Firestore — live on the customer site.</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Global SEO">
          <div className="space-y-3.5">
            <Field label="Site title"><input className="adm-input" value={v.siteTitle} onChange={(e) => setV({ ...v, siteTitle: e.target.value })} /></Field>
            <Field label="Meta description"><textarea rows={3} className="adm-input" value={v.metaDescription} onChange={(e) => setV({ ...v, metaDescription: e.target.value })} /></Field>
            <Field label="Default keywords"><input className="adm-input" value={v.keywords} onChange={(e) => setV({ ...v, keywords: e.target.value })} /></Field>
            <ImageUploader value={v.ogImage || ""} onChange={(url) => setV({ ...v, ogImage: url })} folder="site" label="OG image (social sharing)" hint="Uploads to ImgBB (group /site), URL saves to Firestore on Save" />
            <button className="adm-btn adm-btn-gold" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Global SEO"}</button>
          </div>
        </Card>
        <Card title="Page-level SEO">
          <div className="space-y-4">
            {[["home", "Homepage"], ["shop", "Shop"], ["about", "About"], ["contact", "Contact"], ["compare", "Compare"]].map(([k, l]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-4">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-2">{l}</p>
                <div className="space-y-2">
                  <input className="adm-input" placeholder="Title" value={page(k).title} onChange={(e) => setPage(k, { title: e.target.value })} />
                  <input className="adm-input" placeholder="Description" value={page(k).desc} onChange={(e) => setPage(k, { desc: e.target.value })} />
                </div>
              </div>
            ))}
            <button className="adm-btn adm-btn-gold" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Page SEO"}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

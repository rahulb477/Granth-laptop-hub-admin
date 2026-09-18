"use client";
import React, { useEffect, useState } from "react";
import {
  getDocData,
  setDocData,
} from "@/lib/firestore-service";
import { ImageUploader } from "@/admin/image-uploader";
import { CUSTOMER_WEBSITE_URL } from "@/lib/firebase";

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState({
    businessName: "GRANTH LAPTOP HUB",
    city: "Jodhpur",
    phone: "7413070733",
    whatsapp: "7413070733",
    email: "maakarnicomputer@gmail.com",
    address: "Sardar Market, Jodhpur, Rajasthan 342001",
    instagram: "@granthlaptophub",
    instagramUrl: "https://www.instagram.com/granthlaptophub",
    logo: "",
    favicon: "",
    warrantyText: "6 Months to 1 Year In-Store Warranty Assistance in Jodhpur",
    returnText: "7 Days Easy Replacement for Manufacturing Defects",
    codAvailable: true,
    emiAvailable: true,
    openingHours: "Mon - Sat: 10:30 AM - 8:30 PM | Sun: 11:00 AM - 2:00 PM",
  });

  useEffect(() => {
    getDocData("siteSettings", "main")
      .then((data) => {
        if (data) setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await setDocData("siteSettings", "main", settings);
      setSuccess("Site Settings saved to Firestore /siteSettings/main successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading Site Settings from Firestore...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B88900]">Granth Laptop Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Site Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Document location: <code className="text-slate-700">/siteSettings/main</code> in Firestore
          </p>
        </div>

        <button type="submit" disabled={saving} className="adm-btn adm-btn-gold text-xs py-2 px-4 shadow-sm font-bold">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {success && <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">✓ {success}</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Business Contact */}
        <div className="adm-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Business & Contact Info</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
            <input type="text" value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} className="adm-input text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Calling Phone Number</label>
              <input type="text" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="adm-input text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Business Number</label>
              <input type="text" value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} className="adm-input text-xs font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="adm-input text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className="adm-input text-xs" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Address</label>
            <textarea rows={2} value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="adm-input text-xs" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Hours</label>
            <input type="text" value={settings.openingHours} onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })} className="adm-input text-xs" />
          </div>
        </div>

        {/* Branding & Policies */}
        <div className="space-y-5">
          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Site Logo & Favicon (ImgBB)</h2>
            <ImageUploader
              value={settings.logo}
              onChange={(url) => setSettings({ ...settings, logo: url })}
              folder="site"
              label="Upload Site Logo"
              hint="Select → preview → Upload to ImgBB. The customer website reads this exact Firestore field (siteSettings/main.logo)."
            />
            <ImageUploader
              value={settings.favicon}
              onChange={(url) => setSettings({ ...settings, favicon: url })}
              folder="site"
              label="Upload Favicon (optional)"
              hint="Small square icon for the browser tab. Hosted on ImgBB."
            />
          </div>

          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Social & Online Presence</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram Handle</label>
              <input type="text" value={settings.instagram} onChange={(e) => setSettings({ ...settings, instagram: e.target.value })} className="adm-input text-xs" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Instagram Profile Link</label>
              <input type="text" value={settings.instagramUrl} onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })} className="adm-input text-xs font-mono" />
            </div>
          </div>

          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Store Policies & Features</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Information</label>
              <input type="text" value={settings.warrantyText} onChange={(e) => setSettings({ ...settings, warrantyText: e.target.value })} className="adm-input text-xs" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Return / Replacement Policy</label>
              <input type="text" value={settings.returnText} onChange={(e) => setSettings({ ...settings, returnText: e.target.value })} className="adm-input text-xs" />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!settings.codAvailable} onChange={(e) => setSettings({ ...settings, codAvailable: e.target.checked })} className="rounded text-amber-600 focus:ring-amber-500" />
                <span>Cash on Delivery (COD)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!settings.emiAvailable} onChange={(e) => setSettings({ ...settings, emiAvailable: e.target.checked })} className="rounded text-amber-600 focus:ring-amber-500" />
                <span>No-Cost & Card EMI</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

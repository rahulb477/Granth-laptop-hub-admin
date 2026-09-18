"use client";
import React, { useEffect, useRef, useState } from "react";
import { ACCEPT_ATTR, uploadImageViaServer, validateImageFile } from "@/lib/storage";
import {
  deleteMediaAsset,
  findMediaUsage,
  getMediaAssets,
  saveMediaAsset,
  type FirestoreMediaAsset,
} from "@/lib/firestore-service";

const GROUPS = ["products", "categories", "brands", "homepage", "blog", "videos", "offers", "site"];

export default function MediaLibraryPage() {
  const [selectedGroup, setSelectedGroup] = useState("products");
  const [assets, setAssets] = useState<FirestoreMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usageFor, setUsageFor] = useState<string | null>(null);
  const [usageMap, setUsageMap] = useState<Record<string, string[]>>({});
  const [usageLoading, setUsageLoading] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const list = await getMediaAssets();
      setAssets(list);
    } catch (err: any) {
      setError("Could not load media catalogue: " + (err?.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setError("");
    setSuccess("");
    setUploading(true);
    setProgress(0);

    let done = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const preErr = validateImageFile(file);
        if (preErr) throw new Error(`${file.name}: ${preErr}`);
        const res = await uploadImageViaServer(file, (p) => {
          setProgress(Math.round(((i + p / 100) / files.length) * 100));
        });
        await saveMediaAsset({ url: res.url, name: file.name, group: selectedGroup });
        done++;
      }
      setSuccess(`${done} image(s) uploaded to ImgBB and catalogued ✓`);
      setTimeout(() => setSuccess(""), 4000);
      loadAssets();
    } catch (err: any) {
      console.error("Media upload error:", err);
      setError(err?.message || "Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(""), 2500);
  };

  const handleUsage = async (asset: FirestoreMediaAsset) => {
    if (usageFor === asset.url && usageMap[asset.url]) {
      setUsageFor(null);
      return;
    }
    setUsageFor(asset.url);
    if (usageMap[asset.url]) return;
    setUsageLoading(asset.url);
    const usedIn = await findMediaUsage(asset.url);
    setUsageMap((prev) => ({ ...prev, [asset.url]: usedIn }));
    setUsageLoading("");
  };

  const handleDelete = async (asset: FirestoreMediaAsset) => {
    if (!asset.id) return;
    const usedIn = usageMap[asset.url] ?? (await findMediaUsage(asset.url));
    if (usedIn.length > 0) {
      const ok = confirm(
        `This image is still referenced by:\n• ${usedIn.join("\n• ")}\n\nRemoving it here only deletes the catalogue entry (the ImgBB file stays hosted, so the website won't break). Continue?`
      );
      if (!ok) return;
    } else if (!confirm(`Remove "${asset.name}" from the media catalogue? (ImgBB file stays hosted; Firestore product references are untouched.)`)) {
      return;
    }
    try {
      await deleteMediaAsset(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (err: any) {
      alert("Delete failed: " + (err?.message || "unknown error"));
    }
  };

  const filtered = assets.filter((m) => m.group === selectedGroup);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B88900]">Granth Laptop Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Banner & Slider · Media Library</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            All CMS images hosted on <code className="text-slate-700">i.ibb.co</code> · Catalogue stored in Firestore{" "}
            <code className="text-slate-700">/media</code> · Firebase Storage is not used.
          </p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">{error}</div>}
      {success && <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">✓ {success}</div>}

      {/* Group selector & upload toolbar */}
      <div className="adm-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  selectedGroup === g ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                /{g} ({assets.filter((m) => m.group === g).length})
              </button>
            ))}
          </div>

          <label className="adm-btn adm-btn-gold text-xs py-2 px-3.5 cursor-pointer shadow-sm">
            <span>{uploading ? `Uploading ${progress}%…` : `+ Upload to /${selectedGroup}`}</span>
            <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {uploading && (
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="text-[11px] text-slate-400">JPG · JPEG · PNG · WEBP · up to 10 MB each · uploads go through the secure server endpoint (API key never in the browser).</p>
      </div>

      {/* Media Grid */}
      <div className="adm-card p-5">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading media catalogue from Firestore…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-700">No media catalogued in /{selectedGroup} yet.</p>
            <p>Upload images above — they&apos;re hosted on ImgBB and the URLs save to Firestore automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs flex flex-col group">
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img src={item.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={item.name}>{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate" title={item.url}>{item.url}</p>
                  <button
                    type="button"
                    onClick={() => handleUsage(item)}
                    className="text-[10px] font-bold text-sky-700 hover:underline"
                  >
                    {usageLoading === item.url ? "Scanning…" : usageFor === item.url ? "Hide usage ▲" : "Where is it used? ▼"}
                  </button>
                  {usageFor === item.url && usageMap[item.url] && (
                    <div className="rounded-md bg-slate-50 border border-slate-100 p-1.5 text-[10px] text-slate-600 space-y-0.5 max-h-20 overflow-y-auto">
                      {usageMap[item.url].length === 0 ? (
                        <p className="text-slate-400">Not referenced by any Firestore doc yet.</p>
                      ) : (
                        usageMap[item.url].map((u, i) => <p key={i}>• {u}</p>)
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button type="button" onClick={() => handleCopy(item.url)} className="text-[10px] font-bold text-[#B88900] hover:underline">
                      {copiedUrl === item.url ? "✓ Copied!" : "Copy URL"}
                    </button>
                    <button type="button" onClick={() => handleDelete(item)} className="text-[10px] text-red-500 hover:text-red-700">
                      Remove ref
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="adm-card p-4 text-[12px] text-slate-500">
        <strong>Safety notes:</strong> “Remove ref” only deletes the catalogue entry — ImgBB delete links are never stored or shown, so live website images can&apos;t be broken from here.
        To stop using an image on the site, remove/replace it in the Product, Category, Brand, Homepage, Blog, Video, Offer, or Settings editor and press Save.
      </div>
    </div>
  );
}
